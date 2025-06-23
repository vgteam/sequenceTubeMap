import gzip
import sys
import argparse
import datetime
# from subprocess import Popen,PIPE
import subprocess

parser = argparse.ArgumentParser(description='Build tabix index files for a pangenome.')
parser.add_argument('-g', help='pangenome in GFA', required=True)
parser.add_argument('-o', help='output prefix', default='pg')
parser.add_argument('-s', help='size of haplotype blocks to save', default=100)
args = parser.parse_args()

nodes = {}
orients = ['<', '>']


# TODO try without auto_flip. Don't remember if it's really necessary.
def parsePath(path_raw, auto_flip=True):
    cur_node = ''
    cur_orient = ''
    path = []
    fwd_diff = 0
    for ii in range(len(path_raw)):
        if path_raw[ii] == '<' or path_raw[ii] == '>':
            if cur_node != '':
                cur_node = int(cur_node)
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
        cur_node = int(cur_node)
        path.append([cur_node, cur_orient])
    # flip path if mostly in reverse?
    if auto_flip and fwd_diff < 0:
        path.reverse()
        for ii in range(len(path)):
            path[ii][1] = not path[ii][1]
    return (path)


def parsePathP(path_raw):
    cur_node = ''
    path = []
    for ii in range(len(path_raw)):
        if path_raw[ii] == '+' or path_raw[ii] == '-':
            cur_node = int(cur_node)
            path.append([cur_node, path_raw[ii] == '+'])
            cur_node = ''
        elif path_raw[ii] == ',':
            continue
        else:
            cur_node += path_raw[ii]
    return (path)


def prepareHapChunk(path, nodes, name='ref', coord=''):
    gaf_v = name
    # path length/start/end/strand
    path_len = sum([nodes[no[0]][0] for no in path])
    gaf_v += '\t{}\t0\t{}\t+'.format(path_len, path_len)
    # path information: string representation and length
    path_string = ''
    min_node = path[0][0]
    max_node = path[0][0]
    for no in path:
        path_string += orients[no[1]] + str(no[0])
        min_node = min(min_node, no[0])
        max_node = max(max_node, no[0])
    gaf_v += '\t{}\t{}'.format(''.join(path_string), path_len)
    gaf_v += '\t{}\t{}'.format(0, path_len)
    # residues matching, alignment block size, and mapping quality
    fake_mapq = 60
    gaf_v += '\t{}\t{}\t{}'.format(path_len, path_len, fake_mapq)
    # cigar string
    gaf_v += '\tcs:Z::{}'.format(path_len)
    # coordinate tag
    if coord != '':
        gaf_v += '\trc:Z:{}'.format(coord)
    return ({'gaf': gaf_v, 'path_len': path_len,
             'min_node': min_node, 'max_node': max_node})


# To only do one pass, let's assume that (all) the nodes are defined
# before (any) paths in the GFA
print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      '- Reading {}...'.format(args.g), file=sys.stderr)
if args.g.endswith('gz'):
    gfa_inf = gzip.open(args.g, 'rt')
else:
    gfa_inf = open(args.g, 'rt')

# start processes to sort and bgzip output
h_gz_cmd = "vg gamsort -G - | bgzip > " + args.o + '.haps.gaf.gz'
h_gz_p = subprocess.Popen(h_gz_cmd, stdin=subprocess.PIPE, shell=True)
p_gz_cmd = "sort -k1V -k2n -k3n | bgzip > " + args.o + '.pos.bed.gz'
p_gz_p = subprocess.Popen(p_gz_cmd, stdin=subprocess.PIPE, shell=True)

pos_fmt = '{}\t{}\t{}\t{}\t{}\n'
nodes_written = False
npaths = 0
for line in gfa_inf:
    line = line.rstrip().split('\t')
    if line[0] == 'S':
        # saving both the size and sequence (maybe faster than recomputing the
        # size every time it's needed later)
        nodes[int(line[1])] = [len(line[2]), line[2]]
    else:
        if len(nodes) > 0 and not nodes_written:
            # we were reading nodes and we've just finished
            # write them, in ascending order in a file
            print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  '- Writing node file...', file=sys.stderr)
            n_gz_p = subprocess.Popen("bgzip > " + args.o + ".nodes.tsv.gz",
                                      stdin=subprocess.PIPE, shell=True)
            nodes_ord = list(nodes.keys())
            nodes_ord.sort()
            for node in nodes_ord:
                tow = 'n\t{}\t{}\n'.format(node, nodes[node][1])
                n_gz_p.stdin.write(tow.encode())
            n_gz_p.stdin.close()
            n_gz_p.wait()
            print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  '- Node information written to '
                  '{}.'.format(args.o + ".nodes.tsv.gz"), file=sys.stderr)
            nodes_written = True
            # create tabix index
            print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  '- Indexing nodes', file=sys.stderr)
            idx_cmd = ['tabix', '-f', '-s', '1', '-b', '2', '-e', '2',
                       args.o + ".nodes.tsv.gz"]
            subprocess.run(idx_cmd, check=True)
            print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  '- Nodes indexed.', file=sys.stderr)
        # now potentially prepare the path information
        path = []
        if line[0] == 'W':
            path = parsePath(line[6])
            sampn = line[1]
            hapn = '#' + line[2]
            pathn = '#' + line[3]
            startpos = int(line[4])
        elif line[0] == 'P' and line[1].startswith(args.r):
            path = parsePathP(line[2])
            sampn = line[1]
            pathn = ''
            hapn = ''
            startpos = 0
        if len(path) > 0:
            # we've parsed a path
            # save node positions
            # save haplotype in GAF chunks
            path_pos = 0
            hap_pos = startpos
            while path_pos < len(path):
                path_end = min(len(path), path_pos + args.s)
                seqn = '{}{}{}'.format(sampn, hapn, pathn)
                coordn = '{}:{}'.format(seqn, hap_pos)
                hapchunk = prepareHapChunk(path[path_pos:path_end],
                                           nodes, name=sampn,
                                           coord=coordn)
                # write GAF record
                tow = hapchunk['gaf'] + '\n'
                h_gz_p.stdin.write(tow.encode())
                # write position BED record
                tow = pos_fmt.format(seqn, hap_pos,
                                     hap_pos + hapchunk['path_len'],
                                     hapchunk['min_node'],
                                     hapchunk['max_node'])
                p_gz_p.stdin.write(tow.encode())
                # update position on haplotype
                hap_pos += hapchunk['path_len']
                # go to next chunk
                path_pos = path_end
            npaths += 1
            if npaths % 10000 == 0:
                print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                      '- Wrote info for {} paths'.format(npaths),
                      file=sys.stderr)
gfa_inf.close()

# close position BED bgzip process
p_gz_p.stdin.close()

# close haps GAF bgzip process
h_gz_p.stdin.close()

# wait for sorting/compressing processes to finish
print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      '- Waiting for sort/bgzip processes to finish.', file=sys.stderr)
p_gz_p.wait()
h_gz_p.wait()
print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      '- Output files sorted and bgzipped.', file=sys.stderr)

# create tabix index
print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      '- Indexing position BED', file=sys.stderr)
idx_cmd = ['tabix', '-p', 'bed', args.o + ".pos.bed.gz"]
subprocess.run(idx_cmd, check=True)
print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      '- Position BED indexed.', file=sys.stderr)

# create tabix index
print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      '- Indexing haplotype GAF', file=sys.stderr)
idx_cmd = ['tabix', '-p', 'gaf', args.o + ".haps.gaf.gz"]
subprocess.run(idx_cmd, check=True)
print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
      '- Haplotype GAF indexed.', file=sys.stderr)

exit(0)
