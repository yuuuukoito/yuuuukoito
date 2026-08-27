const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const GIFEncoder = require('gif-encoder-2');
const { Chess } = require('chess.js');

const OUTPUT_GIF = path.join(__dirname, '..', 'assets', 'chess-loop.gif');

// Famous Opera Game (Paul Morphy vs Duke of Brunswick & Count Isouard)
const OPERA_GAME_MOVES = [
  'e4', 'e5',
  'Nf3', 'd6',
  'd4', 'Bg4',
  'dxe5', 'Bxf3',
  'Qxf3', 'dxe5',
  'Bc4', 'Nf6',
  'Qb3', 'Qe7',
  'Nc3', 'c6',
  'Bg5', 'b5',
  'Nxb5', 'cxb5',
  'Bxb5+', 'Nbd7',
  'O-O-O', 'Rd8',
  'Rxd7', 'Rxd7',
  'Rd1', 'Qe6',
  'Bxd7+', 'Nxd7',
  'Qb8+', 'Nxb8',
  'Rd8#'
];

const PIECE_SYMBOLS = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

function createChessGif() {
  console.log('Generating Black & White looping chess GIF...');

  const width = 460;
  const height = 520;
  const squareSize = 50;
  const boardMarginX = 30;
  const boardMarginY = 70;

  const encoder = new GIFEncoder(width, height, 'octree', false);
  encoder.start();
  encoder.setRepeat(0); // 0 = loop indefinitely
  encoder.setQuality(10);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  function drawBoard(chess, lastMove, moveNumberText, evalText) {
    // Background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    // Header container / border
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Title / Game info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('♟ MORPHY\'S OPERA GAME (1858)', width / 2, 38);

    // Move annotation subtext
    ctx.fillStyle = '#999999';
    ctx.font = '13px monospace';
    ctx.fillText(moveNumberText || 'Starting Position', width / 2, 58);

    // Board background container
    const boardW = squareSize * 8;
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(boardMarginX - 4, boardMarginY - 4, boardW + 8, boardW + 8);
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.strokeRect(boardMarginX - 4, boardMarginY - 4, boardW + 8, boardW + 8);

    // Draw coordinates
    ctx.fillStyle = '#777777';
    ctx.font = 'bold 11px sans-serif';
    for (let i = 0; i < 8; i++) {
      // files
      ctx.textAlign = 'center';
      ctx.fillText(files[i], boardMarginX + i * squareSize + squareSize / 2, boardMarginY - 8);
      ctx.fillText(files[i], boardMarginX + i * squareSize + squareSize / 2, boardMarginY + boardW + 16);

      // ranks
      ctx.textAlign = 'right';
      ctx.fillText(ranks[i], boardMarginX - 8, boardMarginY + i * squareSize + squareSize / 2 + 4);
      ctx.textAlign = 'left';
      ctx.fillText(ranks[i], boardMarginX + boardW + 8, boardMarginY + i * squareSize + squareSize / 2 + 4);
    }

    // Draw squares
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = files[c] + ranks[r];
        const isLight = (r + c) % 2 === 0;

        // Monochrome colors
        let squareColor = isLight ? '#f2f2f2' : '#2b2b2b';

        // Highlight last move squares
        if (lastMove) {
          if (lastMove.from === square || lastMove.to === square) {
            squareColor = isLight ? '#d4d4d4' : '#4a4a4a';
          }
        }

        const x = boardMarginX + c * squareSize;
        const y = boardMarginY + r * squareSize;

        ctx.fillStyle = squareColor;
        ctx.fillRect(x, y, squareSize, squareSize);

        // Piece rendering
        const piece = board[r][c];
        if (piece) {
          const symbol = PIECE_SYMBOLS[piece.color][piece.type];
          ctx.font = '36px "Segoe UI Symbol", "Apple Color Emoji", "DejaVu Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const pieceCenterX = x + squareSize / 2;
          const pieceCenterY = y + squareSize / 2;

          if (piece.color === 'w') {
            // White piece: pure white with dark shadow/stroke
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 4;
            ctx.fillText(symbol, pieceCenterX, pieceCenterY);
            ctx.shadowBlur = 0;
          } else {
            // Black piece: solid black with white subtle glow
            ctx.fillStyle = '#0a0a0a';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = 3;
            ctx.fillText(symbol, pieceCenterX, pieceCenterY);
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // Footer info
    ctx.fillStyle = '#888888';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const statusText = chess.isCheckmate()
      ? '🏆 Checkmate! White wins with Rd8#'
      : (chess.turn() === 'w' ? '⚪ White\'s turn' : '⚫ Black\'s turn');
    ctx.fillText(statusText, width / 2, height - 20);
  }

  const chess = new Chess();

  // Initial board state (1.5 seconds)
  drawBoard(chess, null, 'Game Starting...', '');
  encoder.setDelay(1500);
  encoder.addFrame(ctx);

  // Play through the game
  for (let i = 0; i < OPERA_GAME_MOVES.length; i++) {
    const moveStr = OPERA_GAME_MOVES[i];
    const moveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const moveNotation = isWhite ? `${moveNum}. ${moveStr}` : `${moveNum}... ${moveStr}`;

    const move = chess.move(moveStr);
    drawBoard(chess, move, `Move: ${moveNotation}`);

    // Delay: normal moves 800ms, critical moves / checkmate longer
    if (i === OPERA_GAME_MOVES.length - 1) {
      encoder.setDelay(3000); // 3 seconds at checkmate
    } else if (moveStr.includes('+') || moveStr.includes('Qx') || moveStr.includes('Rx')) {
      encoder.setDelay(1000); // 1 sec for tactics
    } else {
      encoder.setDelay(750); // 750ms for regular moves
    }
    encoder.addFrame(ctx);
  }

  encoder.finish();
  const buffer = encoder.out.getData();

  const assetsDir = path.dirname(OUTPUT_GIF);
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(OUTPUT_GIF, buffer);

  console.log(`Saved looping chess GIF to ${OUTPUT_GIF}`);
}

createChessGif();
