document.addEventListener('DOMContentLoaded', () => {
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    const loadingScreen = document.querySelector('.loading-screen');
    const loadingProgress = document.querySelector('.loading-progress');
    const body = document.body;
    const menuToggle = document.querySelector('.menu-toggle');
    const menuClose = document.querySelector('.menu-close');
    const navLinks = document.querySelector('.nav-links');
    const nav = document.querySelector('nav');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        if (loadingProgress) loadingProgress.style.width = `${progress}%`;
        
        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                if (loadingScreen) loadingScreen.classList.add('hidden');
                body.classList.add('loaded');
                initScrambleText(); 
            }, 600);
        }
    }, 100);

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let outlineX = 0;
    let outlineY = 0;

    if (cursorDot && cursorOutline) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        const magneticTargets = document.querySelectorAll('.magnetic-target, a, button');
        magneticTargets.forEach(target => {
            target.addEventListener('mouseenter', () => {
                body.classList.add('hover-magnet');
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
            });
            target.addEventListener('mouseleave', () => {
                body.classList.remove('hover-magnet');
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        });

        const animateCursor = () => {
            let ease = 0.2;
            
            cursorX += (mouseX - cursorX) * ease;
            cursorY += (mouseY - cursorY) * ease;
            
            outlineX += (mouseX - outlineX) * 0.1;
            outlineY += (mouseY - outlineY) * 0.1;

            cursorDot.style.left = `${cursorX}px`;
            cursorDot.style.top = `${cursorY}px`;
            cursorOutline.style.left = `${outlineX}px`;
            cursorOutline.style.top = `${outlineY}px`;

            requestAnimationFrame(animateCursor);
        };
        animateCursor();
    }

    const canvas = document.getElementById('star-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];
        
        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initStars();
        };

        class Star {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2;
                this.opacity = Math.random() * 0.5 + 0.3;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }

            draw() {
                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const initStars = () => {
            stars = [];
            for (let i = 0; i < 80; i++) {
                stars.push(new Star());
            }
        };

        const drawLines = () => {
            for (let i = 0; i < stars.length; i++) {
                for (let j = i + 1; j < stars.length; j++) {
                    const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(0, 243, 255, ${0.2 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(stars[i].x, stars[i].y);
                        ctx.lineTo(stars[j].x, stars[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            
            stars.forEach(star => {
                star.update();
                star.draw();
            });
            drawLines();

            requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();
    }

    function initScrambleText() {
        const scrambleElements = document.querySelectorAll('.scramble-text');
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}—=+*^?#';
        
        scrambleElements.forEach(el => {
            const originalText = el.getAttribute('data-text') || el.textContent;
            let iteration = 0;
            
            const interval = setInterval(() => {
                el.innerText = originalText
                    .split('')
                    .map((letter, index) => {
                        if (index < iteration) {
                            return originalText[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('');
                
                if (iteration >= originalText.length) {
                    clearInterval(interval);
                }
                
                iteration += 1 / 3;
            }, 30);
            
            el.addEventListener('mouseenter', () => {
                let hoverIter = 0;
                const hoverInterval = setInterval(() => {
                    el.innerText = originalText
                        .split('')
                        .map((letter, index) => {
                            if (index < hoverIter) return originalText[index];
                            return chars[Math.floor(Math.random() * chars.length)];
                        })
                        .join('');
                    if (hoverIter >= originalText.length) clearInterval(hoverInterval);
                    hoverIter += 1 / 2;
                }, 30);
            });
        });
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.add('active');
        });
    }
    
    if (menuClose && navLinks) {
        menuClose.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
    
    const cards = document.querySelectorAll('.tilt-card, .work-item');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            
            if(card.classList.contains('work-item')) {
                card.style.setProperty('--x', `${x}px`);
                card.style.setProperty('--y', `${y}px`);
            }
        });
    });

    const currentPath = window.location.pathname;
    const navLinksItems = document.querySelectorAll('.nav-links a');
    navLinksItems.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || 
            (currentPath === '/' && href === '/') ||
            (currentPath.includes('blog') && href.includes('blog'))) {
            link.classList.add('active');
        }
    });
});
