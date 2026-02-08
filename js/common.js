document.addEventListener('DOMContentLoaded', () => {
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    const loadingScreen = document.querySelector('.loading-screen');
    const body = document.body;
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    // Custom Cursor
    if (cursorDot && cursorOutline) {
        document.addEventListener('mousemove', (e) => {
            cursorDot.style.left = e.clientX + 'px';
            cursorDot.style.top = e.clientY + 'px';
            
            setTimeout(() => {
                cursorOutline.style.left = e.clientX + 'px';
                cursorOutline.style.top = e.clientY + 'px';
            }, 50);
        });
    }

    // Loading Screen
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
            body.classList.add('loaded');
        }, 800);
    });

    // Mobile Menu Toggle
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close menu when clicking a link
        const navLinksItems = navLinks.querySelectorAll('a');
        navLinksItems.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // Scroll Reveal Animation
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => observer.observe(el));

    // Set Active Navigation
    const currentPath = window.location.pathname;
    const navLinksItems = document.querySelectorAll('.nav-links a');
    
    navLinksItems.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || 
            (currentPath === '/' && href === '/') ||
            (currentPath.includes('blog') && href.includes('blog')) ||
            (currentPath.includes('about') && href.includes('about')) ||
            (currentPath.includes('privacy') && href.includes('privacy')) ||
            (currentPath.includes('terms') && href.includes('terms'))) {
            link.classList.add('active');
        }
    });

    console.log('Common JS Initialized');
});
