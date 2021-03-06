window.addEventListener('load', newGame);

const GRID_SIZE = 25;
const BOMB_COUNT = 50;

const SMILEY_STATE = {
  HAPPY: '🙂',
  UH_OH: '😮',
  COOL: '😎',
  DEAD: '😵',
};

let cells = {};
let clock;

function setSmileyState(state) {
  document.getElementById('new-game-button').textContent = state;
}

function setSmileyClick() {
  document.getElementById('new-game-button').onclick = newGame;
}

function newGame() {
  setSmileyClick();
  setSmileyState(SMILEY_STATE.HAPPY);
  initBoard();
  if (!clock) clock = new Clock(document.getElementById('clock'));
  clock.stop();
  clock.reset();
}

function initBoard() {
  cells = {};
  const board = document.getElementById('board');
  board.innerHTML = '';
  const boardClone = board.cloneNode(true);
  board.parentNode.replaceChild(boardClone, board);

  let bombCandidates = [];
  for (let i = 0; i < GRID_SIZE; i += 1) {
    for (let j = 0; j < GRID_SIZE; j += 1) {
      const cell = new Cell({ row: i, col: j });
      cells[cell.key] = cell;
      bombCandidates.push(cell);
    }
  }

  for (let i = 0; i < BOMB_COUNT; i += 1) {
    const index = Math.floor(Math.random() * bombCandidates.length);
    bombCandidates[index].isBomb = true;
    bombCandidates = [
      ...bombCandidates.slice(0, index),
      ...bombCandidates.slice(index + 1),
    ];
  }
}

function checkForWin() {
  const allCells = Object.keys(cells).map((key) => cells[key]);
  const revealedCount = allCells.filter((cell) => !cell.isHidden).length;
  if (BOMB_COUNT + revealedCount === allCells.length) {
    endGame(true);
  }
}

function endGame(won) {
  clock.stop();
  const allCells = Object.keys(cells).map((key) => cells[key]);
  allCells.forEach((cell) => cell.removeEventListeners());
  if (won) {
    setSmileyState(SMILEY_STATE.COOL);
    allCells.forEach((cell) => cell.reveal());
  } else {
    setSmileyState(SMILEY_STATE.DEAD);
  }
}

function revealAllBombs() {
  Object.keys(cells)
    .map((key) => cells[key])
    .filter((cell) => cell.isBomb)
    .map((cell) => {
      cell.reveal();
    });
}

class Cell {
  constructor({ row, col, isBomb = false }) {
    this.row = row;
    this.col = col;
    this.key = this.genCellKey(row, col);
    this.isHidden = true;
    this.isBomb = isBomb;
    this.el = document.createElement('div');
    this.el.classList.add('cell', 'cell-hidden');
    const styles = {
      'grid-row-start': `${row + 1}`,
      'grid-row-end': `${row + 1}`,
      'grid-column-start': `${col + 1}`,
      'grid-column-end': `${col + 1}`,
    };
    this.el.setAttribute(
      'style',
      Object.keys(styles)
        .reduce((acc, key) => [...acc, `${key}:${styles[key]}`], [])
        .join(';')
    );
    this.setEventListeners();
    const board = document.getElementById('board');
    board.append(this.el);
  }

  genCellKey(row, col) {
    return `${row}-${col}`;
  }

  setEventListeners() {
    this.el.addEventListener('contextmenu', this.onRightClick, false);
    this.el.addEventListener('mousedown', this.onMouseDown);
    this.el.addEventListener('mouseup', this.onMouseUp);
    this.el.onclick = this.onClick;
  }

  removeEventListeners() {
    this.el.removeEventListener('contextmenu', this.onRightClick);
    this.el.removeEventListener('mousedown', this.onMouseDown);
    this.el.removeEventListener('mouseup', this.onMouseUp);
    this.el.onclick = null;
  }

  onClick = () => {
    clock.start();
    if (this.isFlag) {
      this.toggleFlag();
    } else if (this.isBomb) {
      revealAllBombs();
      this.el.setAttribute('style', 'background:red');
      endGame(false);
    } else {
      this.reveal();
    }
  };

  onMouseDown() {
    setSmileyState(SMILEY_STATE.UH_OH);
  }

  onMouseUp() {
    setSmileyState(SMILEY_STATE.HAPPY);
  }

  onRightClick = (event) => {
    event.preventDefault();
    this.toggleFlag();
  };

  toggleFlag() {
    if (this.isHidden) {
      this.isFlag = !this.isFlag;
      this.el.textContent = this.isFlag ? '🚩' : '';
    }
  }

  reveal() {
    if (this.isHidden) {
      if (this.isBomb) {
        this.el.textContent = '💣';
      } else {
        const n = this.getNeighboringBombCount();
        const textColor = this.getRevealedColor(n);
        if (textColor) {
          this.el.setAttribute('style', `color:${textColor}`);
        }
        this.el.classList.remove('cell-hidden');
        this.el.classList.add('cell-revealed');
        this.el.textContent = String(n || '');
        this.isHidden = false;
        this.revealNeighbors();
        checkForWin();
      }
    }
  }

  getNeighbors() {
    return [
      [this.row - 1, this.col - 1],
      [this.row - 1, this.col],
      [this.row - 1, this.col + 1],
      [this.row, this.col - 1],
      [this.row, this.col + 1],
      [this.row + 1, this.col - 1],
      [this.row + 1, this.col],
      [this.row + 1, this.col + 1],
    ]
      .map(([row, col]) => this.genCellKey(row, col))
      .map((key) => cells[key])
      .filter((cell) => cell && cell.isHidden);
  }

  getNeighboringBombCount() {
    return this.getNeighbors().filter((cell) => cell.isBomb).length;
  }

  getRevealedColor(neighboringBombCount) {
    return [
      'blue',
      'green',
      'red',
      'purple',
      'maroon',
      'turquoise',
      'black',
      'gray',
    ][neighboringBombCount - 1];
  }

  revealNeighbors() {
    const neighbors = this.getNeighbors();
    const nonBombNeighbors = neighbors.filter((cell) => !cell.isBomb);
    if (nonBombNeighbors.length === neighbors.length) {
      nonBombNeighbors.map((cell) => cell.reveal());
    }
  }
}

class Clock {
  constructor(element) {
    this.value = 0;
    this.el = element;
    this.ticking = false;
  }

  start() {
    if (!this.ticking) {
      this.ticking = true;
      this.intervalId = window.setInterval(() => {
        this.value += 1;
        this.el.textContent = this.format();
      }, 1000);
    }
  }

  stop() {
    this.ticking = false;
    window.clearInterval(this.intervalId);
  }

  reset() {
    this.value = 0;
    this.el.textContent = this.format();
    window.clearInterval(this.intervalId);
  }

  format(str = `${this.value}`) {
    return str.length < 3 ? this.format(`0${str}`) : str;
  }
}
