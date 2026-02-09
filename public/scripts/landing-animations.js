/**
 * GridTV Sports - Landing Page Scroll Animations
 * Uses IntersectionObserver for performant scroll-triggered reveals
 * Inspired by benjaminjochims.de animation patterns
 */

(function() {
    'use strict';

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * Initialize all scroll animations
     */
    function init() {
        if (prefersReducedMotion) {
            revealAllImmediately();
            return;
        }

        setupRevealObserver();
        setupHeroAnimation();
        setupNavScrollEffect();
        setupSmoothScroll();
        setupScreenshotCycle();
    }

    /**
     * Cycle between screenshots in the Live Scores section
     */
    function setupScreenshotCycle() {
        const cycleContainer = document.querySelector('.screenshot-cycle');
        if (!cycleContainer) return;

        const images = cycleContainer.querySelectorAll('.screenshot-img');
        if (images.length < 2) return;

        let currentIndex = 0;
        const interval = 4000; // Switch every 4 seconds

        setInterval(() => {
            images[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % images.length;
            images[currentIndex].classList.add('active');
        }, interval);
    }

    /**
     * Reveal all elements immediately for reduced motion users
     */
    function revealAllImmediately() {
        document.querySelectorAll('[data-reveal]').forEach(el => {
            el.classList.add('revealed');
        });
        document.querySelector('.hero')?.classList.add('revealed');
    }

    /**
     * IntersectionObserver for scroll-triggered reveals
     */
    function setupRevealObserver() {
        const revealElements = document.querySelectorAll('[data-reveal]');

        const observerOptions = {
            root: null,
            rootMargin: '-5% 0px -5% 0px',
            threshold: 0.15
        };

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add delay if specified
                    const delay = parseInt(entry.target.dataset.delay || 0, 10);

                    setTimeout(() => {
                        entry.target.classList.add('revealed');
                    }, delay);

                    // Stop observing once revealed
                    revealObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => revealObserver.observe(el));
    }

    /**
     * Trigger hero animations on page load
     */
    function setupHeroAnimation() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        // Trigger hero animations after a short delay
        setTimeout(() => {
            hero.classList.add('revealed');
        }, 100);
    }

    /**
     * Navigation background on scroll
     */
    function setupNavScrollEffect() {
        const nav = document.getElementById('nav');
        if (!nav) return;

        let lastScrollY = 0;
        let ticking = false;

        function updateNav() {
            const scrolled = window.scrollY > 100;
            nav.classList.toggle('scrolled', scrolled);
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            lastScrollY = window.scrollY;
            if (!ticking) {
                requestAnimationFrame(updateNav);
                ticking = true;
            }
        }, { passive: true });
    }

    /**
     * Smooth scroll for anchor links
     */
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();

                const navHeight = document.querySelector('.nav')?.offsetHeight || 80;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            });
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
