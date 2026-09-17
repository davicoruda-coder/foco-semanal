import os
import math
from PIL import Image, ImageDraw

def create_gradient_canvas(width, height, start_color, end_color):
    """Creates a smooth linear diagonal gradient from top-left to bottom-right."""
    base = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    # Precompute color steps
    r1, g1, b1 = start_color
    r2, g2, b2 = end_color
    
    # We can render using scanlines or pixel math
    for y in range(height):
        for x in range(width):
            # Diagonal t from (0, 0) to (width, height)
            t = (x / width * 0.5) + (y / height * 0.5)
            t = max(0.0, min(1.0, t))
            r = int(r1 + (r2 - r1) * t)
            g = int(g1 + (g2 - g1) * t)
            b = int(b1 + (b2 - b1) * t)
            base.putpixel((x, y), (r, g, b, 255))
    return base

def draw_squircle_mask(size, radius_ratio=0.225):
    """High quality super-sampled rounded squircle mask."""
    scale = 4
    s = size * scale
    mask = Image.new("L", (s, s), 0)
    draw = ImageDraw.Draw(mask)
    r = int(s * radius_ratio)
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)

def draw_focohub_icon(size, is_maskable=False):
    # Render at 4x supersampling for flawless antialiasing
    scale = 4
    s = size * scale
    
    # Colors: Refined Modern Violet -> Deep Indigo Gradient
    start_color = (112, 98, 248)  # #7062f8
    end_color = (80, 63, 232)     # #503fe8
    
    # 1. Create gradient background
    # Faster gradient creation with numpy-free interpolation
    img = Image.new("RGBA", (s, s))
    draw = ImageDraw.Draw(img)
    
    # Render gradient via diagonal strips
    for i in range(2 * s):
        t = i / (2 * s)
        r = int(start_color[0] + (end_color[0] - start_color[0]) * t)
        g = int(start_color[1] + (end_color[1] - start_color[1]) * t)
        b = int(start_color[2] + (end_color[2] - start_color[2]) * t)
        draw.line([(0, i), (i, 0)], fill=(r, g, b, 255), width=2)
    
    # 2. Draw target mark
    # For maskable icons, keep within 80% safe zone
    scale_factor = 0.82 if is_maskable else 1.0
    cx = s / 2.0
    cy = s / 2.0
    
    # Balanced geometry:
    # dot radius: 9.8% of s
    # stroke: 6.2% of s
    # ring 1 center radius: 21.6% of s
    # ring 2 center radius: 35.8% of s
    dot_r = s * 0.098 * scale_factor
    stroke_w = s * 0.064 * scale_factor
    r1 = s * 0.222 * scale_factor
    r2 = s * 0.362 * scale_factor
    
    white = (255, 255, 255, 255)
    
    # Outer ring
    draw.ellipse(
        [cx - r2, cy - r2, cx + r2, cy + r2],
        outline=white,
        width=int(round(stroke_w))
    )
    
    # Middle ring
    draw.ellipse(
        [cx - r1, cy - r1, cx + r1, cy + r1],
        outline=white,
        width=int(round(stroke_w))
    )
    
    # Center solid circle
    draw.ellipse(
        [cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r],
        fill=white
    )
    
    # 3. Apply squircle mask if not maskable
    if not is_maskable:
        # Create super-sampled squircle mask
        mask = Image.new("L", (s, s), 0)
        mask_draw = ImageDraw.Draw(mask)
        corner_r = int(s * 0.225)
        mask_draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=corner_r, fill=255)
        img.putalpha(mask)
    
    # 4. Downscale with Lanczos filter to target size
    return img.resize((size, size), Image.Resampling.LANCZOS)

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, "public")
    icons_dir = os.path.join(public_dir, "icons")
    os.makedirs(icons_dir, exist_ok=True)
    
    print("Generating refined FocoHub icons...")
    
    # 512x512 standard
    icon_512 = draw_focohub_icon(512, is_maskable=False)
    icon_512.save(os.path.join(icons_dir, "icon-512.png"), "PNG", optimize=True)
    print("✓ icon-512.png")
    
    # 512x512 maskable (full bleed safe zone)
    icon_maskable = draw_focohub_icon(512, is_maskable=True)
    icon_maskable.save(os.path.join(icons_dir, "icon-maskable-512.png"), "PNG", optimize=True)
    print("✓ icon-maskable-512.png")
    
    # 192x192 standard
    icon_192 = draw_focohub_icon(192, is_maskable=False)
    icon_192.save(os.path.join(icons_dir, "icon-192.png"), "PNG", optimize=True)
    print("✓ icon-192.png")
    
    # 32x32 Favicon PNG
    favicon_32 = draw_focohub_icon(32, is_maskable=False)
    favicon_32.save(os.path.join(public_dir, "favicon.png"), "PNG", optimize=True)
    print("✓ favicon.png")
    
    # Favicon ICO with multiple sizes (16, 32, 48)
    favicon_16 = draw_focohub_icon(16, is_maskable=False)
    favicon_48 = draw_focohub_icon(48, is_maskable=False)
    ico_path = os.path.join(base_dir, "src", "app", "favicon.ico")
    favicon_48.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[favicon_16, favicon_32]
    )
    print("✓ src/app/favicon.ico")

if __name__ == "__main__":
    main()
