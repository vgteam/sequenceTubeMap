/* eslint no-param-reassign: "off" */
/* eslint no-lonely-if: "off" */
/* eslint no-prototype-builtins: "off" */
/* eslint no-console: "off" */

/* eslint max-len: "off" */
/* eslint no-loop-func: "off" */
/* eslint no-unused-vars: "off" */

export const greys = ['#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525', '#000000'];
export const blues = ['#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];
export const reds = ['#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'];
export const plainColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']; // d3 category10
export const lightColors = ['#ABCCE3', '#FFCFA5', '#B0DBB0', '#F0AEAE', '#D7C6E6', '#C6ABA5', '#F4CCE8', '#CFCFCF', '#E6E6AC', '#A8E7ED']; // d3 category10

export function getColorSet(colorSetName) {
  switch (colorSetName) {
    case 'plainColors':
      return plainColors;
    case 'reds':
      return reds;
    case 'blues':
      return blues;
    case 'greys':
      return greys;
    case 'lightColors':
      return lightColors;
    default:
      return greys;
  }
}

export function defineSVGPatterns(svg) {
  let pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'patternA', width: '7', height: '7', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '7', height: '7', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '3', height: '3', fill: '#505050' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '3', height: '3', fill: '#505050' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '3', height: '3', fill: '#505050' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '3', height: '3', fill: '#505050' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'patternB', width: '8', height: '8', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '8', height: '8', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '3', height: '3', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '0', y: '5', width: '3', height: '3', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '5', y: '0', width: '3', height: '3', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '5', y: '5', width: '3', height: '3', fill: '#1f77b4' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid0', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#1f77b4' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#1f77b4' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid1', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#ff7f0e' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#ff7f0e' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#ff7f0e' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid2', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#2ca02c' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#2ca02c' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#2ca02c' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#2ca02c' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid3', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#d62728' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#d62728' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#d62728' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#d62728' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid4', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#9467bd' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#9467bd' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#9467bd' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#9467bd' });

  pattern = svg.append('defs')
    .append('pattern')
    .attr({ id: 'plaid5', width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '6', height: '6', fill: '#FFFFFF' });
  pattern.append('rect')
    .attr({ x: '0', y: '0', width: '2', height: '2', fill: '#8c564b' });
  pattern.append('rect')
    .attr({ x: '0', y: '4', width: '2', height: '2', fill: '#8c564b' });
  pattern.append('rect')
    .attr({ x: '4', y: '0', width: '2', height: '2', fill: '#8c564b' });
  pattern.append('rect')
    .attr({ x: '4', y: '4', width: '2', height: '2', fill: '#8c564b' });
}
