function* range(start, end) {
    for (let i = start; i < end; i++) {
        yield i;
    }
}

/*
Represents an individual character along with a sign. Uses the inherent
ordering on the type of self.char along with the implied ordering of the
type with the negative sign.
self.char -> Symbol representation of the Letter.
self.sign -> True if the Letter is positive, False if the Letter is negative.
*/
class Letter {
  constructor(letter, sign = true) {
    this.letter = letter;
    this.sign = sign;
  }

  toString() {
    if (!this.sign) {
      return `(-${this.letter})`;
    } else {
      return this.letter;
    }
  }

  LE(other) {
    if (this.sign === other.sign) {
      if (this.letter === other.letter) {
        return true;
      }

      return this.letter < other.letter ^ !this.sign;
    } else {
      return !this.sign;
    }
  }

}

/*
Represents a string of Letters and provides operations for getting the set
of runs within the word (i.e. sequences of weakly ascending Letters). Also
gives functionality for determining if a Word is flattened (i.e. the runs are
in weakly increasing order according to the first Letter of each run).
self.letters -> Array of Letters that the Word represents.
self.runs -> List of lists of Letters representing the Word broken into its run.
            Enumerated on construction.
*/
class Word {
  constructor(letters) {
    this.letters = letters;
    this.runs = this.getRuns();
  }

  toString() {
    var str = [];
    for (const letter of this.letters) {
      str.push(letter.toString());
    }

    return str.join("");
  }

  getRuns() {
    var curLetter, currentRun, runs;

    if (this.letters.length === 0) {
      return [];
    } else {
      curLetter = this.letters[0];
    }

    runs = [];
    currentRun = [curLetter];

    for (const i of range(1, this.letters.length)) {
      if (curLetter.LE(this.letters[i])) {
        currentRun.push(this.letters[i]);
      } else {
        runs.push(currentRun);
        currentRun = [this.letters[i]];
      }

      curLetter = this.letters[i];
    }

    runs.push(currentRun);
    return runs;
  }

  getNumRuns() {
    return this.runs.length;
  }

  isFlattened() {
    for (const i of range(0, this.runs.length - 1)) {
      if (!(this.runs[i][0].LE(this.runs[i + 1][0]))) {
        return false;
      }
    }

    return true;
  }

  getRunType() {
    var run_lengths = [];
    for (const run of this.runs) {
      run_lengths.push(run.length);
    }

    return run_lengths;
  }

}

/*
Creates a Word object given an iterable, usually a string.
*/
function makeWord(text) {
  var letters = [];
  for (const letter of text) {
    letters.push(new Letter(letter))
  }

  return new Word(letters);
}

export {makeWord}
