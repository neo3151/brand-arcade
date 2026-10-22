const fs = require('fs');
const path = require('path');

const games = [
  'blockblast', 'solitaire', 'sudoku', 'nonogram', 'minesweeper',
  'mahjong', 'codebreaker', 'wordsearch', 'spidersolitaire', 'spades'
];

const scriptTag = `<script src="../../assets/arcade-nav.js" onerror="this.onerror=null;this.src='../assets/arcade-nav.js';"></script>`;

games.forEach(game => {
  const gameDir = path.join(__dirname, '..', game);
  if (!fs.existsSync(gameDir)) return;

  const htmlFiles = fs.readdirSync(gameDir).filter(f => f.endsWith('.html'));
  htmlFiles.forEach(file => {
    const filePath = path.join(gameDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('arcade-nav.js')) {
      if (content.includes('</body>')) {
        content = content.replace('</body>', `  ${scriptTag}\n</body>`);
      } else {
        content += `\n${scriptTag}\n`;
      }
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Injected arcade-nav.js into ${game}/${file}`);
    }
  });
});
console.log('✓ All games injected with arcade-nav.js');
