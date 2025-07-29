# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This is a React application for Serin, a mental health support platform. The homepage is implemented and ready for development.

## Build and Development Commands

- **Development server**: `npm run dev` (runs on localhost:5173)
- **Build command**: `npm run build`
- **Preview build**: `npm run preview`
- **Linting command**: `npm run lint`

## Architecture Overview

- **Technology Stack**: React 18 + Vite
- **Styling**: CSS with custom styling (no framework)
- **Target Deployment**: Vercel
- **Future Backend**: Supabase (auth, database, etc.)

## Key Directories

- `src/` - Main application source code
  - `App.jsx` - Main homepage component
  - `App.css` - Homepage styling
  - `index.css` - Global styles and resets
- `public/` - Static assets

## Development Workflow

1. Run `npm install` to install dependencies
2. Run `npm run dev` to start development server
3. Homepage displays Serin character, title, and three action buttons
4. Ready for future integration with Supabase backend

## Current Configuration

- Claude Code permissions are configured in `.claude/settings.local.json`
- Currently allows `find` and `ls` bash commands