/**
 * Gallery Page JavaScript
 * Handles lightbox functionality, image navigation, and interactions
 */

(function() {
    'use strict';

    // Gallery state
    let currentImageIndex = 0;
    let galleryImages = [];

    // DOM elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    const lightboxPrev = document.querySelector('.lightbox-prev');
    const lightboxNext = document.querySelector('.lightbox-next');
    const galleryItems = document.querySelectorAll('.gallery-item');

    /**
     * Initialize gallery
     */
    function initGallery() {
        // Collect all gallery images
        galleryItems.forEach((item, index) => {
            const img = item.querySelector('img');
            if (img) {
                galleryImages.push({
                    src: img.src,
                    alt: img.alt
                });

                // Add click event to open lightbox
                item.addEventListener('click', () => openLightbox(index));
            }
        });

        // Add event listeners
        if (lightboxClose) {
            lightboxClose.addEventListener('click', closeLightbox);
        }

        if (lightboxPrev) {
            lightboxPrev.addEventListener('click', showPrevImage);
        }

        if (lightboxNext) {
            lightboxNext.addEventListener('click', showNextImage);
        }

        // Close lightbox on background click
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    closeLightbox();
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyPress);

        // Add smooth scroll behavior for page load
        if (window.location.hash) {
            setTimeout(() => {
                const element = document.querySelector(window.location.hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }

    /**
     * Open lightbox with specific image
     */
    function openLightbox(index) {
        currentImageIndex = index;
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    /**
     * Close lightbox
     */
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    /**
     * Show previous image
     */
    function showPrevImage() {
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        updateLightboxImage();
    }

    /**
     * Show next image
     */
    function showNextImage() {
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        updateLightboxImage();
    }

    /**
     * Update lightbox image
     */
    function updateLightboxImage() {
        const image = galleryImages[currentImageIndex];
        if (lightboxImg && image) {
            // Add fade effect
            lightboxImg.style.opacity = '0';
            
            setTimeout(() => {
                lightboxImg.src = image.src;
                lightboxImg.alt = image.alt;
                lightboxImg.style.opacity = '1';
            }, 150);
        }
    }

    /**
     * Handle keyboard navigation
     */
    function handleKeyPress(e) {
        if (!lightbox.classList.contains('active')) return;

        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                showPrevImage();
                break;
            case 'ArrowRight':
                showNextImage();
                break;
        }
    }

    /**
     * Lazy load images as they come into viewport
     */
    function setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });

        // Observe all lazy images
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    /**
     * Add scroll reveal animation for gallery items
     */
    function setupScrollReveal() {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe gallery items for reveal animation
        galleryItems.forEach(item => {
            revealObserver.observe(item);
        });
    }

    /**
     * Preload adjacent images for smoother navigation
     */
    function preloadAdjacentImages() {
        if (galleryImages.length === 0) return;

        const prevIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        const nextIndex = (currentImageIndex + 1) % galleryImages.length;

        [prevIndex, nextIndex].forEach(index => {
            const img = new Image();
            img.src = galleryImages[index].src;
        });
    }

    /**
     * Add touch swipe support for mobile
     */
    function setupTouchSupport() {
        let touchStartX = 0;
        let touchEndX = 0;

        if (lightbox) {
            lightbox.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            lightbox.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, { passive: true });
        }

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next image
                    showNextImage();
                } else {
                    // Swipe right - previous image
                    showPrevImage();
                }
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initGallery();
            setupLazyLoading();
            setupScrollReveal();
            setupTouchSupport();
        });
    } else {
        initGallery();
        setupLazyLoading();
        setupScrollReveal();
        setupTouchSupport();
    }

    // Preload adjacent images when lightbox opens
    if (lightbox) {
        lightbox.addEventListener('transitionend', () => {
            if (lightbox.classList.contains('active')) {
                preloadAdjacentImages();
            }
        });
    }

})();
