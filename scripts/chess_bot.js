const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const DATA_FILE = path.join(__dirname, '..', 'data', 'chess.json');
const SVG_FILE = path.join(__dirname, '..', 'assets', 'chess-board.svg');
const README_FILE = path.join(__dirname, '..', 'README.md');
const REPO_OWNER = 'yuuuukoito';
const REPO_NAME = 'yuuuukoito';

// Unicode / SVG piece representations
const PIECE_SYMBOLS = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

function loadState() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    lastMove: null,
    gameCount: 1
  };
}

function saveState(state) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function renderSvgBoard(chess, lastMove) {
  const squareSize = 56;
  const padding = 28;
  const boardSize = squareSize * 8;
  const totalWidth = boardSize + padding * 2;
  const totalHeight = boardSize + padding * 2;

  const lightColor = '#f0d9b5';
  const darkColor = '#b58863';
  const highlightFrom = '#cdd26a';
  const highlightTo = '#aaa23a';
  const borderBg = '#262421';
  const textColor = '#bababa';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
  <style>
    .coord { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; fill: ${textColor}; text-anchor: middle; dominant-baseline: middle; }
    .piece { font-family: 'Segoe UI Symbol', 'Apple Color Emoji', 'DejaVu Sans', sans-serif; font-size: 42px; text-anchor: middle; dominant-baseline: central; user-select: none; }
    .piece-w { fill: #ffffff; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.6)); }
    .piece-b { fill: #1a1a1a; filter: drop-shadow(0px 1px 1px rgba(255,255,255,0.4)); }
  </style>
  <rect width="${totalWidth}" height="${totalHeight}" rx="12" fill="${borderBg}"/>
`;

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // Draw coordinates
  for (let i = 0; i < 8; i++) {
    const x = padding + i * squareSize + squareSize / 2;
    const yTop = padding / 2;
    const yBottom = totalHeight - padding / 2;
    svg += `  <text x="${x}" y="${yTop}" class="coord">${files[i]}</text>\n`;
    svg += `  <text x="${x}" y="${yBottom}" class="coord">${files[i]}</text>\n`;

    const y = padding + i * squareSize + squareSize / 2;
    const xLeft = padding / 2;
    const xRight = totalWidth - padding / 2;
    svg += `  <text x="${xLeft}" y="${y}" class="coord">${ranks[i]}</text>\n`;
    svg += `  <text x="${xRight}" y="${y}" class="coord">${ranks[i]}</text>\n`;
  }

  // Draw board squares and pieces
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = files[c] + ranks[r];
      const isLight = (r + c) % 2 === 0;
      let color = isLight ? lightColor : darkColor;

      if (lastMove) {
        if (lastMove.from === square) color = highlightFrom;
        else if (lastMove.to === square) color = highlightTo;
      }

      const x = padding + c * squareSize;
      const y = padding + r * squareSize;

      svg += `  <rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${color}"/>\n`;

      const piece = board[r][c];
      if (piece) {
        const symbol = PIECE_SYMBOLS[piece.color][piece.type];
        const pieceClass = piece.color === 'w' ? 'piece-w' : 'piece-b';
        svg += `  <text x="${x + squareSize / 2}" y="${y + squareSize / 2}" class="piece ${pieceClass}">${symbol}</text>\n`;
      }
    }
  }

  svg += `</svg>`;
  return svg;
}

function generateMarkdownMoves(chess) {
  if (chess.isGameOver()) {
    return `**Game Over!** Click [here](https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=chess%7Cnew%7Cgame&body=Just+click+%27Submit+new+issue%27+to+start+a+new+game.) to start a new game! 🔄`;
  }

  const moves = chess.moves({ verbose: true });
  // Group moves by from square / piece
  const grouped = {};
  for (const m of moves) {
    const key = `${m.piece.toUpperCase()} (${m.from})`;
    if (!grouped[key]) grouped[key] = [];
    const moveUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=chess%7Cmove%7C${m.san}&body=Click+%27Submit+new+issue%27+to+make+this+move.`;
    grouped[key].push(`[\`${m.san}\`](${moveUrl})`);
  }

  let table = `| Piece (Square) | Available Moves |\n| :--- | :--- |\n`;
  for (const [piece, links] of Object.entries(grouped)) {
    table += `| **${piece}** | ${links.join(' &nbsp;•&nbsp; ')} |\n`;
  }

  return table;
}

function updateReadme(chess, state) {
  let readme = fs.readFileSync(README_FILE, 'utf8');

  const turnText = chess.turn() === 'w' ? '⚪ White to move' : '⚫ Black to move';
  let gameStatus = `**Turn:** ${turnText}`;
  if (chess.isCheckmate()) {
    gameStatus = `🏆 **Checkmate!** ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`;
  } else if (chess.isDraw()) {
    gameStatus = `🤝 **Game Draw!**`;
  } else if (chess.inCheck()) {
    gameStatus += ` ⚠️ *(Check!)*`;
  }

  const lastMoveInfo = state.lastMove
    ? `Last move: **${state.lastMove.san}** by @${state.lastMove.author || 'community'}`
    : `Game #${state.gameCount} in progress`;

  const movesTable = generateMarkdownMoves(chess);

  const newGameLink = `[🔄 Start New Game](https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=chess%7Cnew%7Cgame&body=Just+click+%27Submit+new+issue%27+to+start+a+new+game.)`;

  const chessSection = `<!-- CHESS_GAME:START -->
### ♟️ Community Chess in Profile README

<p align="center">
  <img src="./assets/chess-board.svg" alt="GitHub Profile Chess Board" width="400"/>
</p>

<p align="center">
  ${gameStatus} &nbsp;•&nbsp; ${lastMoveInfo} &nbsp;•&nbsp; ${newGameLink}
</p>

<details>
<summary>👉 <b>Click here to view legal moves and play</b></summary>

${movesTable}

</details>

<sub>💡 <i>How to play: Click any move link above, then hit <b>"Submit new issue"</b>. GitHub Actions bot will update the board automatically in seconds!</i></sub>
<!-- CHESS_GAME:END -->`;

  if (readme.includes('<!-- CHESS_GAME:START -->')) {
    readme = readme.replace(/<!-- CHESS_GAME:START -->[\s\S]*?<!-- CHESS_GAME:END -->/, chessSection);
  } else {
    readme = readme.trim() + '\n\n---\n\n' + chessSection + '\n';
  }

  fs.writeFileSync(README_FILE, readme, 'utf8');
}

async function processIssue() {
  const issueTitle = process.env.ISSUE_TITLE || '';
  const issueAuthor = process.env.ISSUE_AUTHOR || 'anonymous';
  const issueNumber = process.env.ISSUE_NUMBER;
  const token = process.env.GITHUB_TOKEN;

  console.log(`Processing issue #${issueNumber}: "${issueTitle}" by @${issueAuthor}`);

  const state = loadState();
  const chess = new Chess(state.fen);

  let message = '';
  let valid = false;

  if (issueTitle.includes('new|game') || issueTitle.includes('new:game')) {
    chess.reset();
    state.fen = chess.fen();
    state.moves = [];
    state.lastMove = null;
    state.gameCount = (state.gameCount || 1) + 1;
    message = `🔄 A new game (#${state.gameCount}) has been started by @${issueAuthor}! Good luck!`;
    valid = true;
  } else if (issueTitle.startsWith('chess|move|') || issueTitle.startsWith('chess:move:') || issueTitle.startsWith('chess|') || issueTitle.startsWith('chess:')) {
    const parts = issueTitle.split(/[:|]/);
    const moveStr = parts[parts.length - 1].trim();

    try {
      const move = chess.move(moveStr);
      if (move) {
        state.fen = chess.fen();
        state.lastMove = {
          san: move.san,
          from: move.from,
          to: move.to,
          author: issueAuthor,
          timestamp: new Date().toISOString()
        };
        state.moves.push(state.lastMove);
        valid = true;
        message = `✅ Move **${move.san}** successfully played by @${issueAuthor}!\n\nNext turn: **${chess.turn() === 'w' ? 'White ⚪' : 'Black ⚫'}**.`;
        if (chess.isCheckmate()) {
          message += `\n\n🏆 **Checkmate!** ${chess.turn() === 'w' ? 'Black' : 'White'} won the game!`;
        } else if (chess.inCheck()) {
          message += `\n\n⚠️ Check!`;
        }
      } else {
        message = `❌ Invalid move "${moveStr}". Please choose one of the available legal moves in the README.`;
      }
    } catch (e) {
      message = `❌ Error applying move "${moveStr}": ${e.message}`;
    }
  } else {
    message = `❓ Unrecognized command in issue title: "${issueTitle}".`;
  }

  if (valid) {
    saveState(state);
    const svg = renderSvgBoard(chess, state.lastMove);
    const assetsDir = path.dirname(SVG_FILE);
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(SVG_FILE, svg, 'utf8');
    updateReadme(chess, state);
    console.log('Board and README updated successfully.');
  }

  // Comment & close issue if running inside GitHub Actions
  if (token && issueNumber) {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Chess-Bot'
      };

      // Add comment
      await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: message })
      });

      // Close issue
      await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ state: 'closed' })
      });
      console.log(`Issue #${issueNumber} commented and closed.`);
    } catch (err) {
      console.error('Error interacting with GitHub API:', err);
    }
  }
}

function init() {
  const state = loadState();
  const chess = new Chess(state.fen);
  saveState(state);

  const assetsDir = path.dirname(SVG_FILE);
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const svg = renderSvgBoard(chess, state.lastMove);
  fs.writeFileSync(SVG_FILE, svg, 'utf8');
  updateReadme(chess, state);
  console.log('Initialized chess game successfully.');
}

if (process.argv.includes('--init')) {
  init();
} else {
  processIssue();
}
