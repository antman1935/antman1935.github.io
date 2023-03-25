import {makeWord} from "./flattened_words.js"

var _pj;

function FlatDict(){};

function _pj_snippets(container) {
  function in_es6(left, right) {
    if (right instanceof Array || typeof right === "string") {
      return right.indexOf(left) > -1;
    } else {
      if (right instanceof Map || right instanceof Set || right instanceof WeakMap || right instanceof WeakSet) {
        return right.has(left);
      } else {
        return left in right;
      }
    }
  }

  function set_properties(cls, props) {
    var desc, value;
    var _pj_a = props;

    for (var p in _pj_a) {
      if (_pj_a.hasOwnProperty(p)) {
        value = props[p];

        if (!(value instanceof Map || value instanceof WeakMap) && value instanceof Object && "get" in value && value.get instanceof Function) {
          desc = value;
        } else {
          desc = {
            "value": value,
            "enumerable": false,
            "configurable": true,
            "writable": true
          };
        }

        Object.defineProperty(cls.prototype, p, desc);
      }
    }
  }

  container["in_es6"] = in_es6;
  container["set_properties"] = set_properties;
  return container;
}

_pj = {};

_pj_snippets(_pj);

const FLAT = "Flattened";
const NFLAT = "Non-Flattened";

/*
Determine if a word (any iterable) is made of unique characters.*/
function isPermutation(word) {
  var letter_dict = {};

  for (const letter of word) {
    if (!_pj.in_es6(letter, letter_dict)) {
      letter_dict[letter] = 0;
    }

    letter_dict[letter] += 1;
  }

  return word.length === Object.keys(letter_dict).length;
}

/*
Applies logarithm base 2 to elements [0,inf) with some special cases.
* For simplicity of making graphs, log_func(0) returns 0.
* To make a nonzero value, returns the specified minimum value so that it is
visible in the graph.*/
function log_func(num, min = 1) {
  if (num === 0) {
    return 0;
  }

  return Math.max(Math.log(num), min);
}

/*
Returns a dictionary identical to the one given, we all of the values replaced
with the log of the value.*/
function dict_log(data) {
  var log_data = {};

  for (const [key, value] of Object.entries(data)) {
    if (value.constructor === Object) {
      log_data[key] = dict_log(value);
    } else {
      log_data[key] = log_func(value);
    }
  }

  return log_data;
}

FlatDict.logarithm = function(graph) {
  if (graph.hasOwnProperty('z_dimension')) {
    return {
      data: dict_log(graph.data),
      type: graph.type,
      x_dimension: graph.x_dimension,
      y_dimension: graph.y_dimension,
      z_dimension: `Log(${graph.z_dimension})`,
    };
  } else {
    return {
      data: dict_log(graph.data),
      type: graph.type,
      x_dimension: graph.x_dimension,
      y_dimension: `Log(${graph.y_dimension})`,
    }
  }
}

/*
Reverse the order of indices in the dict data.*/
function invert3DHistogram(data) {
  var invert = {};

  for (const [x, values] of Object.entries(data)) {
    for (const [y, value] of Object.entries(values)) {
      if (!_pj.in_es6(y, invert)) {
        invert[y] = {};
      }
      invert[y][x] = value;
    }
  }

  return invert;
}

FlatDict.invert3DHistogram = function(graph) {
  return {
    data: invert3DHistogram(graph.data),
    type: graph.type,
    x_dimension: graph.y_dimension,
    y_dimension: graph.x_dimension,
    z_dimension: graph.z_dimension,
  };
}

/* Flatten the dictionary so that each key in the first level maps to the sum
of values of values from the second level.*/
function flatten3DHistogram(data) {
  var new_data = {};
  for (const key in data) {
    new_data[key] = 0;
    for (const y in data[key]) {
      new_data[key] += Number(data[key][y]);
    }
  }
  return new_data;
}

function* range(start, end) {
    for (let i = start; i < end; i++) {
        yield i;
    }
}

FlatDict.flatten3DHistogram = function(graph) {
  return {
    data: flatten3DHistogram(graph.data),
    type: graph.type,
    x_dimension: graph.x_dimension,
    y_dimension: graph.z_dimension,
  }
}

/*
Generates all permutations of length <= n.*/
FlatDict.permutationGenerator = function*(n) {
  function* helper(current_perm, used, i) {
    if (current_perm.length === i) {
      yield current_perm;
    } else {
      for (const j of range(1, i+1)) {
        if (!_pj.in_es6(j, used)) {
          current_perm.push(j);
          used.push(j);

          for (const perm of helper(current_perm, used, i)) {
            yield perm;
          }

          [current_perm.pop(), used.pop()];
        }
      }
    }

    return;
  }

  for (const i of range(1, n+1)) {
    for (const perm of helper([], [], i)) {
      yield perm;
    }
  }

  return;
}

/*
Generates all words (as lists) of length <= n using characters from
[1, 2, ..., n].*/
FlatDict.exhaustiveGenerator = function*(n) {
  function* helper(current_str, length) {
    if (current_str.length === length) {
      yield current_str;
    } else {
      for (const i of range(1, n+1)) {
        current_str.push(i);

        for (const new_str of helper(current_str, length)) {
          yield new_str;
        }

        current_str.pop();
      }
    }

    return;
  }

  for (const length of range(1, n+1)) {
    for (const new_str of helper([], length)) {
      yield new_str;
    }
  }

  return;
}

/*
Generator reads from a file hosted at a remote address*/
FlatDict.remoteFileGenerator = function*(name, perm) {
  const lines = native_lang_files[name];
  for (const line of lines) {
    const text = line.trim();
    if (perm && !isPermutation(text)) {
      continue;
    }

    yield text;
  }
}

/*
Reads in a dictionary file (each word on a single line, no empty lines except
at the end) and finds the values for two histograms:
1: distribution of words by runs and length (flat and unflat)
2: distribution of words by runs (flat and unflat)
3: distribution of words by length (flat and unflat)
filename -> name of the dictionary file relative to the script.*/
FlatDict.findFlattened = function(generator) {
  var _3d_histograms = {
    [NFLAT]: {},
    [FLAT]: {}
  };

  for (const entry of generator) {
    const word = makeWord(entry);
    const flat = word.isFlattened() ? FLAT : NFLAT;
    const length = entry.length;
    const runs = word.getNumRuns();

    if (!_pj.in_es6(length, _3d_histograms[flat])) {
      _3d_histograms[flat][length] = {};
    }

    if (!_pj.in_es6(runs, _3d_histograms[flat][length])) {
      _3d_histograms[flat][length][runs] = 0;
    }

    _3d_histograms[flat][length][runs] += 1;
  }

  const graphs = {
    [NFLAT]:  {
      data: _3d_histograms[NFLAT],
      type: "Non-Flattened",
      x_dimension: "Length",
      y_dimension: "Runs",
      z_dimension: "Count",
    },
    [FLAT]:  {
      data: _3d_histograms[FLAT],
      type: "Flattened",
      x_dimension: "Length",
      y_dimension: "Runs",
      z_dimension: "Count",
    },
  };
  return graphs;
}

const native_langs = ["dansk", "deutsch", "english3", "espanol", "francais", "italiano", "nederlands3", "norsk", "swiss", "usa2"];
var native_lang_files = {};
var builder = {};
for (const native_lang of native_langs) {
  builder[native_lang] = fetch(`/resources/${native_lang}.txt`).then(result => result.text()).then(text=> text.split("\n")).then(lines => native_lang_files[native_lang] = lines);
}

export {FlatDict, FLAT, NFLAT}

export default await builder;
