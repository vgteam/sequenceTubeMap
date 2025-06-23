import argparse
import subprocess
import json
import sys


def parsePath(path_raw):
    cur_node = ''
    cur_orient = ''
    path = []
    fwd_diff = 0
    for ii in range(len(path_raw)):
        if path_raw[ii] == '<' or path_raw[ii] == '>':
            if cur_node != '':
                path.append([cur_node, cur_orient])
            cur_orient = path_raw[ii] == '>'
            if cur_orient:
                fwd_diff += 1
            else:
                fwd_diff += -1
            cur_node = ''
        else:
            cur_node += path_raw[ii]
    if cur_node != '':
        path.append([cur_node, cur_orient])
    return (path)


def parseCigar(cs_tag, cs_type='cs'):
    cs = []
    val = ''
    edit = ''
    for ii in range(len(cs_tag)):
        if cs_type == 'cs':
            # ex: cs:Z:+ATG:360*AT-G:1*CG:137
            if cs_tag[ii] in [':', '*', '+', '-']:
                if val != '':
                    cs.append([edit, val])
                val = ''
                edit = cs_tag[ii]
            else:
                val += cs_tag[ii]
        elif cs_type == 'cg':
            # ex: cg:Z:24=1D185=1X1151=1X87=1I157=
            if cs_tag[ii] in ['=', 'X', 'I', 'D']:
                edit = cs_tag[ii]
                if edit == '=':
                    edit = ':'
                elif edit == 'X':
                    edit = '*'
                    val = 'N' * int(val)
                    val = val + val
                elif edit == 'I':
                    edit = '+'
                    val = 'N' * int(val)
                elif edit == 'D':
                    edit = '-'
                    val = 'N' * int(val)
                cs.append([edit, val])
                val = ''
            else:
                val += cs_tag[ii]
    # for cs type, don't forget to insert the last 'ongoing' one
    if cs_type == 'cs' and val != '':
        cs.append([edit, val])
    return (cs)


def prepareJsonMapOnNode(node_orient, offset, cigar, nodes_seq):
    json_map = {}
    json_map['edit'] = []
    json_map['position'] = {}
    if not node_orient[1]:
        json_map['position']['is_reverse'] = True
    json_map['position']['node_id'] = node_orient[0]
    if node_orient[0] in nodes_seq and len(cigar) > 0:
        bp_remaining = len(nodes_seq[node_orient[0]]) - offset
        while bp_remaining > 0 and len(cigar) > 0:
            # get the next cigar operation
            next_co = cigar.pop(0)
            cig_bp = 0
            # update edits, remaining bases, and cigar
            if next_co[0] == ':':
                # matches
                cig_bp = int(next_co[1])
                if cig_bp > bp_remaining:
                    json_map['edit'].append({'from_length': bp_remaining,
                                             'to_length': bp_remaining})
                    # add back remaining cigar operation
                    next_co[1] = str(cig_bp - bp_remaining)
                    cigar.insert(0, next_co)
                    # no more bases remaining in this node
                    bp_remaining = 0
                else:
                    json_map['edit'].append({'from_length': cig_bp,
                                             'to_length': cig_bp})
                    bp_remaining += - cig_bp
            elif next_co[0] == '*':
                # substitution
                json_map['edit'].append({'from_length': 1,
                                         'sequence': next_co[1][1],
                                         'to_length': 1})
                bp_remaining += -1
            elif next_co[0] == '+':
                # insertion in read
                json_map['edit'].append({'sequence': next_co[1],
                                         'to_length': len(next_co[1])})
            elif next_co[0] == '-':
                # deletion in read
                cig_bp = len(next_co[1])
                if cig_bp > bp_remaining:
                    json_map['edit'].append({'from_length': bp_remaining})
                    # update cigar and add it back at the front
                    next_co[1] = next_co[1][bp_remaining:]
                    cigar.insert(0, next_co)
                    # no more bases remaining in this node
                    bp_remaining = 0
                else:
                    json_map['edit'].append({'from_length': cig_bp})
                    bp_remaining += - cig_bp
        # DEBUG test: if the next operation is an insert, add it to this node
        if len(cigar) > 0 and cigar[0][0] == '+' and node_orient[1]:
            next_co = cigar.pop(0)
            # insertion in read
            json_map['edit'].append({'sequence': next_co[1],
                                     'to_length': len(next_co[1])})
        # don't forget to specify offset
        if offset > 0:
            json_map['position']['offset'] = str(offset)
    elif node_orient[0] in nodes_seq:
        # we're here if we know about this node but a node before was missing
        # we can't trust the cigar anymore so we just write full node overlap
        nlen = len(nodes_seq[node_orient[0]])
        json_map['edit'].append({'from_length': nlen,
                                 'to_length': nlen})
    else:
        # if we don't know this node, assumes it's 1bp long and forget
        # about the cigar/offset
        json_map['edit'].append({'from_length': 1,
                                 'to_length': 1})
        # to remember that we had a missing node (and can't trust the cigar for
        # the other nodes) we clear the cigar info
        cigar.clear()
    return (json_map)


parser = argparse.ArgumentParser()
parser.add_argument('-n', help='indexed nodes', required=True)
parser.add_argument('-p', help='indexed positions BED', required=True)
parser.add_argument('-g', help='indexed haplotypes GAF', required=True)
parser.add_argument('-r', help='region to query', required=True)
parser.add_argument('-a', default=[], action='append',
                    help='indexed annotations (optional). Can repeat.')
parser.add_argument('-o', help='output prefix', default='chunk')
parser.add_argument('-j', help='also make JSON output (e.g. for tubemap)',
                    action='store_true')
parser.add_argument('-s', help='simplify haplotypes by merging identical ones'
                    ' (for the JSON output)', action='store_true')
args = parser.parse_args()

# args = parser.parse_args(['-n', 'pg.nodes.tsv.bgz',
#                           '-g', 'pg.haps.gaf.gz',
#                           '-p', 'pg.pos.bed.gz',
#                           '-a', 'pg.haps.gaf.gz',
#                           '-r', 'GRCh38#0#chr6:3000000-3001000'])

# parse queried region
ref_path_name = args.r.split(':')[0]
qint = args.r.split(':')[1]
qstart = int(qint.split('-')[0])
qend = int(qint.split('-')[1])

# extract nodes in region
cmd = ['tabix', args.p, args.r]
try:
    cmd_o = subprocess.run(cmd, check=True, capture_output=True)
except subprocess.CalledProcessError as e:
    sys.exit(e.stderr.decode())
nodes_bed = cmd_o.stdout.decode().rstrip().split('\n')
nodes_bed = [line.split('\t') for line in nodes_bed]

# stop if no nodes were found in that region
if len(nodes_bed) == 1 and len(nodes_bed[0]) == 1 and nodes_bed[0][0] == '':
    sys.exit('No nodes overlap this region.')

# find minimum and maximum node IDs and reference positions
min_node = int(nodes_bed[0][3])
max_node = int(nodes_bed[0][3])
# loop over all extracted nodes
for nbed in nodes_bed:
    node_s = int(nbed[3])
    node_e = int(nbed[4])
    min_node = min(min_node, node_s, node_e)
    max_node = max(max_node, node_s, node_e)
max_node += 1

# extract haplotypes in region
cmd = ['tabix', args.g, '{{node}}:{}-{}'.format(min_node, max_node)]
try:
    cmd_o = subprocess.run(cmd, check=True, capture_output=True)
except subprocess.CalledProcessError as e:
    sys.exit(e.stderr.decode())
haps_gaf = cmd_o.stdout.decode().rstrip().split('\n')
haps_gaf = [line.split('\t') for line in haps_gaf]

# organize haplotype subpaths
subhaps_path = {}
for hgaf in haps_gaf:
    # extract contig name and position from rc tag
    rc_ii = 12
    while 'rc:Z:' not in hgaf[rc_ii]:
        rc_ii += 1
    rc = hgaf[rc_ii].replace('rc:Z:', '').split(':')
    hname = rc[0]
    hstart = int(rc[1])
    hend = int(rc[1]) + int(hgaf[1])
    # if queried path, make sure it overlaps the queried range
    if hname == ref_path_name and (hend < qstart or hstart > qend):
        # skip, if not
        continue
    # parse path
    path = parsePath(hgaf[5])
    # make sure at least one node is in the node range
    overlap_range = False
    for no in path:
        if int(no[0]) >= min_node and int(no[0]) <= max_node:
            overlap_range = True
            break
    if not overlap_range:
        continue
    # save all in dict
    if hname not in subhaps_path:
        subhaps_path[hname] = {'paths': {}, 'pos': [], 'end': {}}
    # save path
    subhaps_path[hname]['paths'][rc[1]] = path
    # save position in haplotype
    subhaps_path[hname]['pos'].append(hstart)
    subhaps_path[hname]['end'][rc[1]] = hend

# stitch into one path per haplotype
haps_full_paths = {}
min_ref_pos = 0
all_perfectly_stitched = True
for hname in subhaps_path:
    # sort the positions
    pos = subhaps_path[hname]['pos']
    pos.sort()
    # remember the start position of ref path
    if hname == ref_path_name:
        min_ref_pos = pos[0]
    # stitch paths
    paths = [[]]
    prev_end = -1
    for pp in pos:
        if prev_end != -1 and prev_end != pp:
            # end position of the previous chunk doesn't match current position
            # we shouldn't stich and instead create another sub-path
            paths.append([])
            all_perfectly_stitched = False
        paths[-1] += subhaps_path[hname]['paths'][str(pp)]
        prev_end = subhaps_path[hname]['end'][str(pp)]
    # save the haplotype path or each pieces (if not stitched in one piece)
    if len(paths) == 1:
        haps_full_paths[hname] = paths[0]
    else:
        for ii, path in enumerate(paths):
            haps_full_paths['{}_p{}'.format(hname, ii)] = path

if all_perfectly_stitched:
    print('All haplotypes could be stitched back in one piece')
else:
    print('Some haplotypes could not be stitched back in one piece')

# to save the "default" reference path
nodes_ref = {}
for no in haps_full_paths[ref_path_name]:
    nodes_ref[no[0]] = True
# this is used for a first round of "trimming" of the haplotypes
# another round is done later to match the queried range better

# prepare paths before the actual round of trimming
haps_paths_pretrim = {}
# this is to know which nodes to include (and get information later)
nodes_inc = {}
# process each haplotype path
for hname in haps_full_paths:
    path = haps_full_paths[hname]
    # trim ends of path until they touch a node on ref (queried) path
    path_beg = 0
    while path[path_beg][0] not in nodes_ref and path_beg < len(path) - 1:
        path_beg += 1
    path_end = len(path) - 1
    while path[path_end][0] not in nodes_ref and path_end > 0:
        path_end += -1
    path_end += 1
    path = path[path_beg:path_end]
    # skip empty path
    if len(path) == 0:
        continue
    # otherwise save path
    haps_paths_pretrim[hname] = path
    for no in path:
        nodes_inc[no[0]] = True

# optional extract and write GAF
annot_forjsons_l = []
# eventually other nodes that we'll need to include (just in case)
nodes_inc_others = {}
if args.a != '':
    for annot_idx, annot_fn in enumerate(args.a):
        # extract with tabix
        cmd = ['tabix', annot_fn, '{{node}}:{}-{}'.format(min_node, max_node)]
        try:
            cmd_o = subprocess.run(cmd, check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            sys.exit(e.stderr.decode())
        annot_gaf = cmd_o.stdout.decode().rstrip().split('\n')
        agaf_of = open(args.o + '.{}.annot.gaf'.format(annot_idx), 'wt')
        annot_forjson = []
        for gaf_line_r in annot_gaf:
            # prepare the json output, just in case
            if gaf_line_r == '':
                continue
            gaf_line = gaf_line_r.split('\t')
            path = parsePath(gaf_line[5])
            # check if at least one node is in subgraph of interest
            no_overlap = True
            for no in path:
                if no[0] in nodes_inc:
                    no_overlap = False
                    break
            if no_overlap:
                continue
            # it touches the subgraph, we can write it
            agaf_of.write(gaf_line_r + '\n')
            # prepare JSON information
            apath = {'name': gaf_line[0]}
            apath['mapq'] = int(gaf_line[11])
            apath['pathl_remain'] = int(gaf_line[1])
            apath['offset'] = int(gaf_line[7])
            apath['path'] = path
            # check is nodes are missing
            for nidx, no in enumerate(path):
                if no[0] not in nodes_inc:
                    nodes_inc_others[no[0]] = True
            # add optional tags as "sample_name"
            if len(gaf_line) > 12:
                # TODO: don't include base qualities
                tags = {}
                for tag in gaf_line[12:]:
                    pos_col = tag.index(':')
                    tagn = tag[0:pos_col]
                    tagv = tag[(tag.index(':', pos_col+1)+1):]
                    tags[tagn] = tagv
                apath['tags'] = tags
            # save path info
            annot_forjson.append(apath)
        agaf_of.close()
        annot_forjsons_l.append(annot_forjson)

# update nodes to include with the potentially new ones
for node in nodes_inc_others:
    nodes_inc[node] = True

# find sequence for nodes to include
nodes_seq = {}
# first, cluster them to avoid too many queries
# to cluster, sort by node ID
sorted_nodes = [int(node) for node in nodes_inc]
sorted_nodes.sort()
# then group if next ID is not too far
node_cls = []
max_node_jump = 1000
for node in sorted_nodes:
    if len(node_cls) == 0:
        node_cls.append([node])
    else:
        if node_cls[-1][-1] + max_node_jump < node:
            # print(node - node_cls[-1][-1] + max_node_jump)
            # we need a new node cluster
            node_cls.append([node])
        else:
            node_cls[-1].append(node)
# query node information for each cluster
for ncl in node_cls:
    print('Searching for {}-{} node sequences.'.format(ncl[0], ncl[-1]))
    cmd = ['tabix', args.n, 'n:{}-{}'.format(ncl[0], ncl[-1])]
    try:
        cmd_o = subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.stderr.decode())
    pos_tsv = cmd_o.stdout.decode().rstrip().split('\n')
    for posr in pos_tsv:
        posr = posr.split('\t')
        if posr[1] in nodes_inc:
            nodes_seq[posr[1]] = posr[2]

# second round of trimming to match the queried range exactly
# trim the "reference" path first
cur_pos = min_ref_pos
max_ref_pos = 0
nodes_ref = {}
within_range = False
for no in haps_full_paths[ref_path_name]:
    if cur_pos + len(nodes_seq[no[0]]) >= qstart and len(nodes_ref) == 0:
        # if we weren't within range, now we are
        within_range = True
        min_ref_pos = cur_pos
    if within_range:
        nodes_ref[no[0]] = True
    if cur_pos + len(nodes_seq[no[0]]) >= qend and within_range:
        # we'll be out of range next node
        within_range = False
        max_ref_pos = cur_pos + len(nodes_seq[no[0]])
    cur_pos += len(nodes_seq[no[0]])
assert max_ref_pos > 0, 'no end position found, pb with haplotype stitching?'
# now trim all the haplotypes until they touch these nodes
haps_paths = {}
nodes_inc = {}
# also simplify haplotypes and tally hap frequency
haps_freq = {}
haps_hash = {}
haps_names = {}
# and save edges
edges_l = {}
lfmt = 'L\t{}\t{}\t{}\t{}\t0M'
orient_v = ['-', '+']
# process each path
for hname in haps_paths_pretrim:
    path = haps_paths_pretrim[hname]
    # trim ends of path until they touch a node on ref (queried) path
    path_beg = 0
    while path[path_beg][0] not in nodes_ref and path_beg < len(path) - 1:
        path_beg += 1
    path_end = len(path) - 1
    while path[path_end][0] not in nodes_ref and path_end > 0:
        path_end += -1
    path_end += 1
    path = path[path_beg:path_end]
    # skip empty path
    if len(path) == 0:
        continue
    # otherwise save path
    # maybe check if we want to simplify it first
    if args.s:
        # make a string ID of the path and check if identical already present
        path_hash = '_'.join(['{}_{}'.format(ro[0], ro[1]) for ro in path])
        if hname == ref_path_name:
            # keep the reference path separate
            haps_paths[hname] = path
            haps_freq[hname] = 1
            haps_names[hname] = hname
        elif path_hash in haps_hash:
            # if present, increment frequency
            haps_freq[haps_hash[path_hash]] += 1
            haps_names[haps_hash[path_hash]] += ', ' + hname
        else:
            # otherwise, save and init the hash dict
            haps_paths[hname] = path
            haps_freq[hname] = 1
            haps_hash[path_hash] = hname
            haps_names[hname] = hname
    else:
        haps_paths[hname] = path
        haps_names[hname] = hname
        haps_freq[hname] = 1
    # save edges and nodes to include
    prev_no = []
    for no in path:
        nodes_inc[no[0]] = True
        if len(prev_no) != 0:
            ename = '{}_{}-{}_{}'.format(prev_no[0], prev_no[1],
                                         no[0], no[1])
            if ename not in edges_l:
                edges_l[ename] = lfmt.format(prev_no[0], orient_v[prev_no[1]],
                                             no[0], orient_v[no[1]])
        prev_no = no

print('{} nodes, {} edges, {} paths in subgraph'.format(len(nodes_inc),
                                                        len(edges_l),
                                                        len(haps_paths_pretrim)))

# write GFA
gfa_of = open(args.o + '.gfa', 'wt')
# write header
gfa_of.write('H\tVN:Z:1.1\n')
# write nodes
for node in nodes_seq:
    # currently we keep nodes in that new subgraph of interest and nodes that
    # might be touched by the annotations. Could be too much but that might
    # avoid some errors later? Of note those extra nodes won't be on any
    # haplotype or edges. So it's only useful is the sequenceTubeMap wants
    # the node information/sequence to represent the reads/annotations
    if node in nodes_inc or node in nodes_inc_others:
        gfa_of.write('S\t{}\t{}\n'.format(node, nodes_seq[node]))
# write paths
for hname in haps_paths:
    # guess sample/haplotype/contig names
    hap = 0
    contig = hname
    sample = hname
    hname_v = hname.split('#')
    if len(hname_v) == 2:
        # reference path as "sample#contig"
        sample = hname_v[0]
        contig = hname_v[1]
    elif len(hname_v) == 3:
        # reference path as "sample#contig"
        sample = hname_v[0]
        hap = hname_v[1]
        contig = hname_v[2]
    # compute path size and string
    psize = 0
    pstring = ''
    for no in haps_paths[hname]:
        psize += len(nodes_seq[no[0]])
        pstring += ['<', '>'][no[1]] + no[0]
    # prepare W line
    wline = 'W\t{}\t{}\t{}\t0'.format(sample, hap, contig)
    wline += '\t{}\t{}\n'.format(psize, pstring)
    gfa_of.write(wline)
# write edges
for ename in edges_l:
    gfa_of.write(edges_l[ename] + '\n')
gfa_of.close()

# write JSON output of graph
nodes_in_graph = {}
if args.j:
    json_pg = {}
    # nodes
    json_pg['node'] = []
    for node in nodes_seq:
        if node in nodes_inc or node in nodes_inc_others:
            json_pg['node'].append({'id': node,
                                    'sequence': nodes_seq[node]})
    # paths
    json_pg['path'] = []
    # the reference path should be first
    path_names = list(haps_paths.keys())
    path_names.remove(ref_path_name)
    path_names.insert(0, ref_path_name)
    for hname in path_names:
        json_path = {}
        json_path['name'] = haps_names[hname]
        json_path['mapping'] = []
        for nidx, no in enumerate(haps_paths[hname]):
            json_map = {}
            json_map['edit'] = {}
            node_size = len(nodes_seq[no[0]])
            json_map['edit']['from_length'] = str(node_size)
            json_map['edit']['to_length'] = str(node_size)
            json_map['position'] = {}
            if not no[1]:
                json_map['position']['is_reverse'] = True
            json_map['position']['node_id'] = no[0]
            json_map['rank'] = str(nidx + 1)
            json_path['mapping'].append(json_map)
            nodes_in_graph[no[0]] = True
        json_pg['path'].append(json_path)
    json_of = open(args.o + '.graph.json', 'wt')
    json.dump(json_pg, json_of)
    json_of.close()
    # also make an annotate.txt file with frequency of each haplotype
    annot_of = open(args.o + '.annotate.txt', 'wt')
    for hname in path_names:
        annot_of.write('{}\t{}\n'.format(haps_names[hname], haps_freq[hname]))
    annot_of.close()
    # also a region.tsv file with the reference path name and region offset
    reg_of = open(args.o + '.regions.tsv', 'wt')
    reg_of.write('{}\t{}\t{}\n'.format(ref_path_name,
                                       min_ref_pos, max_ref_pos))
    reg_of.close()

# write JSON output for the annotations
if args.a != '' and args.j:
    for annot_idx, annot_forjson in enumerate(annot_forjsons_l):
        annot_json = []
        for apath in annot_forjson:
            path = apath['path']
            json_read = {'name': apath['name']}
            json_read['mapping_quality'] = apath['mapq']
            json_mapping = []
            pathl_remain = apath['pathl_remain']
            offset = apath['offset']
            cigar = []
            if 'cs' in apath['tags']:
                cigar = parseCigar(apath['tags']['cs'])
            elif 'cg' in apath['tags']:
                cigar = parseCigar(apath['tags']['cg'], cs_type='cg')
            no_overlap = True
            for nidx, no in enumerate(path):
                if nidx != 0:
                    offset = 0
                json_map = prepareJsonMapOnNode(no, offset, cigar, nodes_seq)
                json_map['rank'] = str(nidx + 1)
                json_mapping.append(json_map)
                if json_map['position']['node_id'] in nodes_in_graph:
                    no_overlap = False
            # skip paths that don't overlap with subgraph
            if no_overlap:
                continue
            # trim ends
            while json_mapping[0]['position']['node_id'] not in nodes_in_graph:
                json_mapping.pop(0)
            while json_mapping[-1]['position']['node_id'] not in nodes_in_graph:
                json_mapping.pop()
            json_read['path'] = {'mapping': json_mapping}
            # add optional tags as "sample_name"
            if 'tags' in apath:
                opts = []
                for tagn in apath['tags']:
                    tagv = apath['tags'][tagn]
                    # filter keep some tags
                    if tagn in ['bq']:
                        continue
                    # shorten long tag values
                    if len(tagv) > 20:
                        tagv = tagv[:20] + '...'
                    opts.append('{}={}'.format(tagn, tagv))
                opts = ' '.join(opts)
                # json_read['sample_name'] = opts.replace(',', ', ')
            annot_json.append(json_read)
        # write JSON
        ajson_of = open(args.o + '.{}.annot.json'.format(annot_idx), 'wt')
        for ajson in annot_json:
            ajson_of.write(json.dumps(ajson) + "\n")
        ajson_of.close()
