:root {
    --bg-deep: #050508;
    --bg-accent: #0f172a;
    --text-main: #f0f9ff;
    --text-sub: #94a3b8;
    --accent-cyan: #06b6d4;
    --accent-blue: #3b82f6;
    --accent-purple: #8b5cf6;
    --glass-bg: rgba(15, 23, 42, 0.6);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-highlight: rgba(255, 255, 255, 0.15);
    --nav-height: 70px;
    --font-jp: 'Noto Sans JP', sans-serif;
    --font-en: 'JetBrains Mono', monospace;
    --easing: cubic-bezier(0.23, 1, 0.32, 1);
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    cursor: none;
}

::selection {
    background: var(--accent-cyan);
    color: #000;
}

body {
    background-color: var(--bg-deep);
    color: var(--text-main);
    font-family: var(--font-jp);
    line-height: 1.8;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    position: relative;
    opacity: 0;
    transition: opacity 0.5s ease;
}

body.loaded {
    opacity: 1;
}

h1, h2, h3, .nav-logo, .tagline, .work-link-arrow {
    font-family: var(--font-en);
}

a {
    text-decoration: none;
    color: inherit;
    transition: color 0.3s var(--easing);
    cursor: none;
}

.cursor-dot,
.cursor-outline {
    position: fixed;
    top: 0;
    left: 0;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    z-index: 9999;
    pointer-events: none;
}

.cursor-dot {
    width: 8px;
    height: 8px;
    background-color: var(--accent-cyan);
    box-shadow: 0 0 10px var(--accent-cyan);
}

.cursor-outline {
    width: 40px;
    height: 40px;
    border: 1px solid rgba(6, 182, 212, 0.5);
    transition: width 0.2s, height 0.2s, background-color 0.2s;
}

body:hover .cursor-outline {
    background-color: rgba(6, 182, 212, 0.05);
}

a:hover ~ .cursor-outline,
button:hover ~ .cursor-outline {
    width: 60px;
    height: 60px;
    background-color: rgba(6, 182, 212, 0.1);
    border-color: var(--accent-cyan);
}

.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 0.8s cubic-bezier(0.76, 0, 0.24, 1);
}

.loading-screen.hidden {
    transform: translateY(-100%);
}

.loading-logo {
    font-family: var(--font-en);
    font-size: 2rem;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 15px;
    animation: pulseLogo 2s infinite;
}

.loading-logo i {
    color: var(--accent-cyan);
    font-size: 2.5rem;
}

@keyframes pulseLogo {
    0% { opacity: 0.5; transform: scale(0.95); }
    50% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 15px var(--accent-cyan)); }
    100% { opacity: 0.5; transform: scale(0.95); }
}

.cosmic-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -2;
    background: radial-gradient(circle at 50% 0%, #1a1a2e 0%, #050508 60%);
}

.stars {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background-image: 
        radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
        radial-gradient(1.5px 1.5px at 100px 70px, #fff, rgba(0,0,0,0)),
        radial-gradient(1px 1px at 50px 160px, #ddd, rgba(0,0,0,0)),
        radial-gradient(2px 2px at 200px 120px, #fff, rgba(0,0,0,0));
    background-size: 500px 500px;
    opacity: 0.8;
    animation: starMove 100s linear infinite;
}

@keyframes starMove {
    from { transform: translateY(0); }
    to { transform: translateY(-500px); }
}

nav {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: var(--nav-height);
    background: rgba(5, 5, 8, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--glass-border);
    z-index: 1000;
}

.nav-container {
    max-width: 1200px;
    height: 100%;
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-logo {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 12px;
}

.nav-logo i {
    color: var(--accent-cyan);
}

.nav-links {
    display: flex;
    gap: 24px;
}

.nav-links a {
    color: var(--text-sub);
    font-weight: 600;
    font-size: 0.9rem;
    position: relative;
    padding: 5px 0;
}

.nav-links a::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--accent-cyan);
    transition: width 0.3s var(--easing);
}

.nav-links a:hover, .nav-links a.active {
    color: var(--text-main);
}

.nav-links a:hover::before, .nav-links a.active::before {
    width: 100%;
}

.menu-toggle {
    display: none;
    background: none;
    border: none;
    color: var(--text-main);
    font-size: 1.5rem;
    cursor: none;
}

.container {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    padding: calc(var(--nav-height) + 60px) 24px 80px;
    flex: 1;
}

.card-glass {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    transition: all 0.4s var(--easing);
}

.card-glass:hover {
    border-color: var(--glass-highlight);
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.1);
}

footer {
    border-top: 1px solid var(--glass-border);
    background: rgba(2, 2, 3, 0.9);
    backdrop-filter: blur(10px);
    padding: 60px 24px 40px;
    margin-top: auto;
}

.footer-content {
    max-width: 1100px;
    margin: 0 auto;
    text-align: center;
}

.footer-links {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 24px;
    margin-bottom: 32px;
}

.footer-links a {
    color: var(--text-sub);
    font-size: 0.9rem;
    transition: color 0.3s;
}

.footer-links a:hover {
    color: var(--accent-cyan);
}

.copyright {
    color: var(--text-sub);
    font-size: 0.8rem;
    opacity: 0.5;
    font-family: var(--font-en);
}

.scroll-reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.8s var(--easing), transform 0.8s var(--easing);
}

.scroll-reveal.visible {
    opacity: 1;
    transform: translateY(0);
}

@media (max-width: 768px) {
    .menu-toggle {
        display: block;
    }
    
    .nav-links {
        position: fixed;
        top: 0;
        right: -100%;
        width: 100%;
        height: 100vh;
        background: rgba(5, 5, 8, 0.98);
        backdrop-filter: blur(20px);
        flex-direction: column;
        justify-content: center;
        align-items: center;
        transition: right 0.4s var(--easing);
        z-index: 999;
    }
    
    .nav-links.active {
        right: 0;
    }
    
    .nav-links a {
        font-size: 1.2rem;
        padding: 15px;
        width: 100%;
        text-align: center;
    }
    
    .cursor-dot, .cursor-outline {
        display: none;
    }
    
    * {
        cursor: auto;
    }
}
