Add-Type -AssemblyName System.Drawing
$imagePath = "c:\Users\park4\OneDrive\Desktop\test7\sglimu-test1\sglimu-test1-f7f80df16df9dd0d0a27af85970c4fb2f22e7ee0\assets\logo_green.png"

Write-Output "Loading image: $imagePath"
$bmp = New-Object System.Drawing.Bitmap($imagePath)
$width = $bmp.Width
$height = $bmp.Height

Write-Output "Image size: $width x $height. Processing background removal..."

# Create a new bitmap with transparency support
$newBmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($newBmp)
$g.Clear([System.Drawing.Color]::Transparent)

for ($x = 0; $x -lt $width; $x++) {
    for ($y = 0; $y -lt $height; $y++) {
        $pixelColor = $bmp.GetPixel($x, $y)
        # If the pixel is close to white (R > 220, G > 220, B > 220), we make it transparent.
        # Otherwise, we keep the original color.
        if ($pixelColor.R -gt 220 -and $pixelColor.G -gt 220 -and $pixelColor.B -gt 220) {
            # Skip setting pixel to leave it transparent
        } else {
            $newBmp.SetPixel($x, $y, $pixelColor)
        }
    }
}

# Dispose resources to release file lock
$bmp.Dispose()
$g.Dispose()

# Save the new image, overwriting the original
Write-Output "Saving transparent image..."
$newBmp.Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)
$newBmp.Dispose()

Write-Output "Background removal complete!"
