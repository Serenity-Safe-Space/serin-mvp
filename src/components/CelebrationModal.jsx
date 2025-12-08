import React, { useEffect, useRef } from 'react'
import './CelebrationModal.css'

const CelebrationModal = ({ isVisible, onClose, message }) => {
    const canvasRef = useRef(null)

    useEffect(() => {
        if (!isVisible) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const particles = []
        const particleCount = 150
        const gravity = 0.5
        const colors = ['#FFEB5B', '#FF6B6B', '#4ECDC4', '#FFFFFF', '#9D50BB']

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width
                this.y = Math.random() * canvas.height - canvas.height
                this.vx = Math.random() * 6 - 3
                this.vy = Math.random() * 5 + 2
                this.size = Math.random() * 8 + 4
                this.color = colors[Math.floor(Math.random() * colors.length)]
                this.rotation = Math.random() * Math.PI * 2
                this.rotationSpeed = Math.random() * 0.2 - 0.1
            }

            update() {
                this.x += this.vx
                this.y += this.vy
                this.vy += gravity * 0.4
                this.rotation += this.rotationSpeed

                if (this.y > canvas.height) {
                    this.y = -20
                    this.x = Math.random() * canvas.width
                    this.vy = Math.random() * 5 + 2
                }
            }

            draw() {
                ctx.save()
                ctx.translate(this.x, this.y)
                ctx.rotate(this.rotation)
                ctx.fillStyle = this.color
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size)
                ctx.restore()
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle())
        }

        let animationId
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach(p => {
                p.update()
                p.draw()
            })
            animationId = requestAnimationFrame(animate)
        }

        animate()

        // Auto dismiss
        const timer = setTimeout(() => {
            onClose()
        }, 4000)

        const handleResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        window.addEventListener('resize', handleResize)

        return () => {
            cancelAnimationFrame(animationId)
            clearTimeout(timer)
            window.removeEventListener('resize', handleResize)
        }
    }, [isVisible, onClose])

    if (!isVisible) return null

    return (
        <div className="celebration-overlay" onClick={onClose}>
            <canvas ref={canvasRef} className="celebration-canvas" />
            <div className="celebration-content animate-pop-in">
                <div className="celebration-icon">🎉</div>
                <h2 className="celebration-title">Awesome!</h2>
                <p className="celebration-message">{message}</p>
            </div>
        </div>
    )
}

export default CelebrationModal
