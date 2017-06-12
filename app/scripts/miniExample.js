import * as tubeMap from './tubemap';

const nodes = [
  { name: 'A', seq: 'AAAA' },
  { name: 'B', seq: 'TTG' },
  { name: 'C', seq: 'CC' },
];

const paths = [
  { id: 0, name: 'Track 1', sequence: ['A', 'B', 'C'] },
  { id: 1, name: 'Track 2', sequence: ['A', '-B', 'C'] },
  { id: 2, name: 'Track 3', sequence: ['A', 'C'] },
];

tubeMap.create({
  svgID: '#svg',
  nodes,
  tracks: paths,
});
tubeMap.useColorScheme(0);
