import Chart from 'chart.js/auto';

window.Chart = Chart;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Synaptic Particle Neural Canvas (Sinnapse-Style Hero Background)
    const canvas = document.getElementById('gt-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.parentElement.offsetWidth;
        let height = canvas.height = canvas.parentElement.offsetHeight;

        window.addEventListener('resize', () => {
            if (!canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.offsetWidth;
            height = canvas.height = canvas.parentElement.offsetHeight;
        });

        const particles = [];
        const particleCount = Math.min(Math.floor(width / 22), 65);
        let mouse = { x: null, y: null, radius: 150 };

        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        canvas.parentElement.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.75;
                this.vy = (Math.random() - 0.5) * 0.75;
                this.radius = Math.random() * 2 + 1.2;
                this.baseAlpha = Math.random() * 0.5 + 0.3;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                if (mouse.x !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < mouse.radius) {
                        const force = (mouse.radius - dist) / mouse.radius;
                        this.x += (dx / dist) * force * 1.5;
                        this.y += (dy / dist) * force * 1.5;
                    }
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(228, 163, 24, ${this.baseAlpha})`;
                ctx.shadowColor = '#E4A318';
                ctx.shadowBlur = 6;
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 130) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        const alpha = (1 - dist / 130) * 0.28;
                        ctx.strokeStyle = `rgba(228, 163, 24, ${alpha})`;
                        ctx.lineWidth = 0.85;
                        ctx.shadowBlur = 0;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // 2. Interactive Spotlight Pointer for Bento Cards
    document.querySelectorAll('.gt-bento-card').forEach((card) => {
        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        });
    });

    // 3. Horizontal Expanding Project Cards (Accordion Slider)
    const cards = document.querySelectorAll('.hm-c');
    cards.forEach((card) => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.hm-c-cta') || e.target.closest('a')) return;
            const wasActive = card.classList.contains('ativo');
            cards.forEach(c => c.classList.remove('ativo'));
            if (!wasActive) {
                card.classList.add('ativo');
            }
        });
    });

    console.log('GundjaTech Sinnapse Engine initialized.');
});
