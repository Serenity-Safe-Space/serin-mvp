import React from 'react'
import './ProgressCircle.css'

const ProgressCircle = ({ current, target, label, sublabel, size = 120 }) => {
    const radius = size / 2 - 10
    const circumference = 2 * Math.PI * radius

    // Cap progress at 100%
    const progress = Math.min(current / target, 1)
    const offset = circumference - progress * circumference

    return (
        <div className="progress-circle-container" style={{ width: size, height: size }}>
            <svg
                className="progress-ring"
                width={size}
                height={size}
            >
                <circle
                    className="progress-ring__circle-bg"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="progress-ring__circle"
                    stroke="#FFEB5B"
                    strokeWidth="8"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{
                        strokeDasharray: `${circumference} ${circumference}`,
                        strokeDashoffset: offset,
                    }}
                />
            </svg>
            <div className="progress-circle-content">
                <span className="progress-current">{current}</span>
                <span className="progress-separator">/</span>
                <span className="progress-target">{target}</span>
                {label && <div className="progress-label">{label}</div>}
                {sublabel && <div className="progress-sublabel">{sublabel}</div>}
            </div>
        </div>
    )
}

export default ProgressCircle
