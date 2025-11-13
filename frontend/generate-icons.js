// Simple script to create placeholder PNG icons
const fs = require('fs');

// Create a simple data URL for a purple gradient square with TWU text
const createIconDataURL = (size) => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23764ba2;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='${size}' height='${size}' fill='url(%23grad)' rx='${size * 0.2}'/%3E%3Ctext x='50%25' y='${size * 0.6}' font-family='Arial' font-size='${size * 0.35}' font-weight='bold' fill='white' text-anchor='middle'%3ETWU%3C/text%3E%3C/svg%3E`;
};

console.log('Icon files already exist (SVG format)');
console.log('For production, convert these to PNG using an online tool or ImageMagick');
console.log('192x192:', createIconDataURL(192));
console.log('512x512:', createIconDataURL(512));
