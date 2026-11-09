from PIL import Image, ImageDraw, ImageFont
import os

width, height = 320, 110
img = Image.new('RGB', (width, height), color='#0D2E5C')
draw = ImageDraw.Draw(img)

# White inner border
draw.rectangle([(4, 4), (width - 5, height - 5)], outline='#FFFFFF', width=2)

# Left emblem box
draw.rectangle([(8, 8), (85, height - 9)], fill='#0D2E5C', outline='#FFFFFF', width=1)
# Emblem circles
draw.ellipse([(20, 16), (72, 68)], outline='#FBB03B', width=3)
draw.polygon([(46, 24), (60, 52), (32, 52)], fill='#FBB03B')
# "Since 2001"
try:
    font_small = ImageFont.truetype("times.ttf", 12)
    font_large = ImageFont.truetype("arialbd.ttf", 36)
    font_sub = ImageFont.truetype("arialbd.ttf", 13)
except:
    font_small = font_large = font_sub = ImageFont.load_default()

draw.text((46, 75), "Since 2001", fill='#FFFFFF', font=font_small, anchor='mt')

# Right yellow box for GNiOT
draw.rectangle([(92, 12), (width - 12, 68)], fill='#FBB03B')
draw.text(((92 + width - 12)/2, 40), "GNiOT", fill='#0D2E5C', font=font_large, anchor='mm')

# Bottom navy box for ENGG. INSTITUTE
draw.rectangle([(92, 72), (width - 12, 98)], fill='#0D2E5C')
draw.text(((92 + width - 12)/2, 85), "ENGG. INSTITUTE", fill='#FFFFFF', font=font_sub, anchor='mm')

output_path = os.path.abspath('d:/consta/synopsis/gniot_logo.png')
img.save(output_path, dpi=(300, 300))
print("GNIOT logo saved to:", output_path)
