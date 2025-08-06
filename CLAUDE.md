# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website for "Caminhos de Hekate" (Hekate's Paths), a Portuguese-language spiritual services website focused on Hekate-related rituals, courses, and products. The site is built with vanilla HTML, CSS, and JavaScript without any build tools or frameworks.

## Project Structure

The project consists of three main files:
- `index.html` - Main HTML structure with all page content
- `styles.css` - Complete CSS styling with responsive design
- `script.js` - JavaScript for interactivity and animations

## Development Workflow

Since this is a static HTML/CSS/JS website, there are no build commands or package managers involved:

### Testing the Site
- Open `index.html` directly in a web browser
- Use a local server for testing (e.g., `python -m http.server 8000` or `npx serve .`)
- Test responsive design using browser developer tools

### Making Changes
- Edit files directly in any text editor
- Refresh browser to see changes immediately
- No compilation or build process required

## Key Features and Architecture

### CSS Architecture
- Uses CSS Grid and Flexbox for responsive layouts
- Custom CSS variables for consistent color scheme (#d4af37 gold, #1a1a2e dark blue)
- Smooth animations and transitions throughout
- Mobile-first responsive design with breakpoints at 768px and 480px

### JavaScript Features
- Responsive navigation with hamburger menu
- Smooth scrolling for anchor links
- Parallax effects and scroll-based animations
- Intersection Observer for fade-in animations
- Dynamic price counters and typing effects
- Custom cursor effects and particle animations
- Form handling with simulated submission

### Content Sections
The single-page application includes:
- Hero section with mystical symbols
- Ritual services section
- Courses section (3 different course tiers)
- Products section (6 different spiritual products)
- Testimonials
- Contact form
- Footer with social links

## Styling Guidelines

- Font families: 'Cinzel' for headings (serif), 'Open Sans' for body text
- Primary colors: Gold (#d4af37), Dark blue (#1a1a2e)
- Consistent use of border-radius (15px for cards, 50px for buttons)
- Box shadows for depth and elevation
- Gradient backgrounds for visual interest

## JavaScript Patterns

- Event delegation for dynamic elements
- Intersection Observer API for performance-optimized animations
- CSS custom properties manipulation for dynamic styling
- Modular function organization
- Error-free DOM manipulation with null checks

## Content Notes

This is a spiritual/mystical website in Portuguese focusing on Hekate worship and related services. All content is themed around rituals, spiritual courses, and mystical products. The site uses religious and mystical imagery throughout.