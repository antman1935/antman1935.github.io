import {CSPL} from './CSPL.js'
import {FlatDict, FLAT, NFLAT} from './flattened_dictionary.js'

function getXsAndYs(data) {
  var xkeys = Object.keys(data);
  xkeys.sort(function(a, b){return Number(a) - Number(b)});
  var xs = [];
  var ys = [];
  for (const i of xkeys) {
    xs.push(Number(i));
    ys.push(Number(data[i]));
  }
  return [xs, ys];
}

function makeRibbonGraph(graph, div, ribbon_width) {
  var traces = [];

  let data = graph.data;
  for (const x in data) {
    var trace_data = {x: [], y: [], z:[]};
    var ribbon_edges = [x - (ribbon_width / 2.0), x - (-ribbon_width / 2.0)];

    if (Object.keys(data[x]).length <= 2) {
      // not enough points to interpolate a curve. Just do sharp line graph
      for (const y in data[x]) {
        trace_data.x.push(ribbon_edges);
        trace_data.y.push([y, y]);
        trace_data.z.push([data[x][y], data[x][y]]);
      }
    } else {
      // treat this cross section as a 2d graph, interpolate the curve, then plot.
      let [xs, ys] = getXsAndYs(data[x])

      var inter_xs = [];
      var inter_ys = [];

      CSPL.interpolatePoints(xs, ys, xs[0], xs[xs.length - 1], 200, inter_xs, inter_ys);

      for (var i = 0; i < inter_xs.length; ++i) {
        trace_data.x.push(ribbon_edges);
        trace_data.y.push([inter_xs[i], inter_xs[i]]);
        trace_data.z.push([inter_ys[i], inter_ys[i]]);
      }
    }

    traces.push({
      x:trace_data.x, y:trace_data.y, z:trace_data.z,
      name: `${graph.x_dimension}=${x}`,
      type: 'surface',
      showscale: false
    });
  }

  let layout = {
    title: `Frequency of ${graph.type} Words`,
    showlegend: true,
    autosize: true,
    width: 600,
    height: 600,
    scene: {
      xaxis: {title: graph.x_dimension},
      yaxis: {title: graph.y_dimension},
      zaxis: {title: graph.z_dimension}
    }
  };

  Plotly.newPlot(div, traces, layout);
};

function make2DBarGraph(graph, div) {
  const [xs, ys] = getXsAndYs(graph.data);
  const trace = {
    x: xs,
    y: ys,
    type:"bar",
  };

  let layout = {
    title: `Frequency of ${graph.type} Words`,
    width: 600,
    height: 600,
    xaxis: {title: graph.x_dimension},
    yaxis: {title: graph.y_dimension},
  };

  Plotly.newPlot(div, [trace], layout);
}

function makeLabeledLineGraphs(graph, div) {
  var traces = [];

  let data = graph.data;
  for (const key in data) {
    var trace_data = {x: [], y: []};

    if (Object.keys(data[key]).length < 2) {
      // not enough points to interpolate a curve. Just do sharp line graph
      for (const x in data[key]) {
        trace_data.x.push(x);
        trace_data.y.push(data[key][x]);
      }
    } else {
      // treat this cross section as a 2d graph, interpolate the curve, then plot.
      let [xs, ys] = getXsAndYs(data[key]);

      var inter_xs = [];
      var inter_ys = [];

      CSPL.interpolatePoints(xs, ys, xs[0], xs[xs.length - 1], 200, inter_xs, inter_ys);

      for (var i = 0; i < inter_xs.length; ++i) {
        trace_data.x.push(inter_xs[i]);
        trace_data.y.push(inter_ys[i]);
      }
    }

    traces.push({
      x:trace_data.x, y:trace_data.y,
      name: `${graph.x_dimension}=${key}`,
      type: 'scatter',
      mode: 'lines',
      line: {shape: 'linear'},
      showscale: false
    });
  }

  let layout = {
    title: `Frequency of ${graph.type} Words, Grouped by ${graph.x_dimension}`,
    showlegend: true,
    autosize: true,
    width: 600,
    height: 600,
    xaxis: {title: graph.y_dimension},
    yaxis: {title: graph.z_dimension},
  };

  Plotly.newPlot(div, traces, layout);
}

function make2DStackedBarGraph(graphs, div) {
  var traces = [];
  var x_dim, y_dim;
  for (const word_class in graphs) {
    const [xs, ys] = getXsAndYs(graphs[word_class].data);
    const trace = {
      x: xs,
      y: ys,
      type: "bar",
      name: graphs[word_class].type,
    };
    traces.push(trace);
    x_dim = graphs[word_class].x_dimension;
    y_dim = graphs[word_class].y_dimension;
  }

  let layout = {
    title: `Frequency of Words by ${x_dim}`,
    width: 600,
    height: 600,
    xaxis: {title: x_dim},
    yaxis: {title: y_dim},
    barmode: "stack",
  };

  Plotly.newPlot(div, traces, layout);
}

window.selectGenerator = function(generator_name, args) {
  if (generator_name == "native_lang") {
    return FlatDict.remoteFileGenerator(args[0], args[1]);
  } else if (generator_name == "permutation_generator") {
    return FlatDict.permutationGenerator(args[0]);
  } else if (generator_name == "exhaustive_generator") {
    return FlatDict.exhaustiveGenerator(args[0]);
  }

  return undefined;
}

window.getGraphs = function(generator) {
  return FlatDict.findFlattened(generator);
}

window.showGraphs = function(graphs, options, div1, div2) {
  var graph_data = graphs;
  if (options.logarithm) {
    for (const [key,value] of Object.entries(graphs)) {
      graph_data[key]  = FlatDict.logarithm(value);
    }
  }
  if (options.graph == "3d") {
    let type = (options.type == "flat") ? FLAT : NFLAT;
    makeRibbonGraph(graph_data[type], div1, 0.4);
    makeRibbonGraph(FlatDict.invert3DHistogram(graph_data[type]), div2, 0.4);
  } else if (options.graph == "2d") {
    var flat_graphs = {};
    var inv_flat_graphs = {};
    for (const word_class of Object.keys(graph_data)) {
      flat_graphs[word_class] = FlatDict.flatten3DHistogram(graph_data[word_class]);
      inv_flat_graphs[word_class] = FlatDict.flatten3DHistogram(FlatDict.invert3DHistogram(graph_data[word_class]));
    }

    if (options.type == "all") {
      make2DStackedBarGraph(flat_graphs, div1);
      make2DStackedBarGraph(inv_flat_graphs, div2);
    } else {
      let type = (options.type == "flat") ? FLAT : NFLAT;
      make2DBarGraph(flat_graphs[type], div1);
      make2DBarGraph(inv_flat_graphs[type], div2);
    }
  } else if (options.graph == "3dflat") {
    let type = (options.type == "flat") ? FLAT : NFLAT;
    makeLabeledLineGraphs(graph_data[type], div1);
    makeLabeledLineGraphs(FlatDict.invert3DHistogram(graph_data[type]), div2);
  }
}
