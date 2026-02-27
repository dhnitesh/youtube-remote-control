"""
Simple icon generator for the browser extension
Creates basic placeholder icons
"""

from PIL import Image, ImageDraw, ImageFont

def create_icon(size, output_path):
    """Create a simple icon with a play button symbol"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size), '#667eea')
    draw = ImageDraw.Draw(img)

    # Draw a white circle background
    circle_margin = size // 6
    draw.ellipse(
        [circle_margin, circle_margin, size - circle_margin, size - circle_margin],
        fill='white'
    )

    # Draw a play triangle
    triangle_margin = size // 3
    triangle_points = [
        (triangle_margin + size // 10, triangle_margin),
        (triangle_margin + size // 10, size - triangle_margin),
        (size - triangle_margin, size // 2)
    ]
    draw.polygon(triangle_points, fill='#667eea')

    # Save icon
    img.save(output_path, 'PNG')
    print(f'Created icon: {output_path}')

if __name__ == '__main__':
    import os

    # Create icons directory if it doesn't exist
    icons_dir = 'icons'
    os.makedirs(icons_dir, exist_ok=True)

    # Generate icons in different sizes
    create_icon(16, os.path.join(icons_dir, 'icon16.png'))
    create_icon(48, os.path.join(icons_dir, 'icon48.png'))
    create_icon(128, os.path.join(icons_dir, 'icon128.png'))

    print('\nIcons generated successfully!')
    print('You can replace these with custom icons if desired.')
