/**
 * store.js — Power-up shop for Curious Solitaire (zero ads, simulated local purchases).
 * Curious Solitaire (Wonderland Theme)
 */

const STORE_PACKAGES = [
  {
    id: 'starter',
    title: 'Tea Party Starter',
    icon: '🍵',
    hints: 10,
    peeks: 5,
    shuffles: 5,
    price: '$0.99',
    badge: null,
    desc: 'Perfect for easing into curious new deals.'
  },
  {
    id: 'explorer',
    title: 'Wonderland Explorer',
    icon: '🔍',
    hints: 25,
    peeks: 12,
    shuffles: 12,
    price: '$1.99',
    badge: 'Most Popular',
    featured: true,
    desc: 'Ample power to uncover every hidden path.'
  },
  {
    id: 'royal',
    title: "Queen's Royal Treasury",
    icon: '👑',
    hints: 75,
    peeks: 40,
    shuffles: 40,
    price: '$4.99',
    badge: 'Best Value',
    desc: 'A royal bounty fit for the sovereign of the garden.'
  },
  {
    id: 'infinite',
    title: 'Master Looking Glass',
    icon: '🗝️',
    hints: 200,
    peeks: 100,
    shuffles: 100,
    price: '$9.99',
    badge: null,
    desc: 'Virtually limitless guidance through every curious maze.'
  }
];

function buyPackage(pkgId, buttonElement) {
  const pkg = STORE_PACKAGES.find(p => p.id === pkgId);
  if (!pkg) return;

  if (buttonElement) {
    buttonElement.disabled = true;
    buttonElement.textContent = 'Unlocking...';
  }

  setTimeout(() => {
    window.SolitaireProgress.addPowerUps(pkg.hints, pkg.peeks, pkg.shuffles);

    if (buttonElement) {
      buttonElement.textContent = 'Purchased! ✓';
      buttonElement.classList.add('btn--purchased');
      setTimeout(() => {
        buttonElement.disabled = false;
        buttonElement.textContent = `Buy ${pkg.price}`;
        buttonElement.classList.remove('btn--purchased');
      }, 1500);
    }

    updateStoreInventoryUI();
    showStoreToast(`Added ${pkg.hints} Hints, ${pkg.peeks} Peeks & ${pkg.shuffles} Shuffles!`);
  }, 350);
}

function updateStoreInventoryUI() {
  const hintCountEl = document.getElementById('store-hints-count');
  const peekCountEl = document.getElementById('store-peeks-count');
  const shuffleCountEl = document.getElementById('store-shuffles-count');

  if (hintCountEl) hintCountEl.textContent = window.SolitaireProgress.getHints();
  if (peekCountEl) peekCountEl.textContent = window.SolitaireProgress.getPeeks();
  if (shuffleCountEl) shuffleCountEl.textContent = window.SolitaireProgress.getShuffles();
}

function showStoreToast(msg) {
  let toast = document.getElementById('store-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'store-toast';
    toast.className = 'store-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('store-toast--show');
  setTimeout(() => {
    toast.classList.remove('store-toast--show');
  }, 2500);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORE_PACKAGES, buyPackage };
} else {
  window.SolitaireStore = {
    PACKAGES: STORE_PACKAGES,
    buyPackage,
    updateStoreInventoryUI,
    showStoreToast
  };
}
