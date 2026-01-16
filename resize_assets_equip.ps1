Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Height
    )

    Write-Host "Resizing $InputPath to ${Width}x${Height}..."

    try {
        if (-not (Test-Path $InputPath)) {
            Write-Warning "File not found: $InputPath"
            return
        }

        $srcImg = [System.Drawing.Bitmap]::FromFile($InputPath)
        
        # Create a new bitmap with the target dimensions
        $destImg = New-Object System.Drawing.Bitmap($Width, $Height)
        $g = [System.Drawing.Graphics]::FromImage($destImg)
        
        # Set interpolation mode to NearestNeighbor for crisp pixel art
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
        
        # Draw the source image onto the destination
        $g.DrawImage($srcImg, 0, 0, $Width, $Height)
        
        $g.Dispose()
        $srcImg.Dispose()
        
        $destImg.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $destImg.Dispose()
        
        Write-Host "Saved resized image to $OutputPath"
    }
    catch {
        Write-Error "Failed to resize $InputPath : $_"
    }
}

# Resize All Character Assets to 32x32
$Assets = @(
    "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\hat.png",
    "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\shirt.png",
    "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\pants.png",
    "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\shoes.png"
)

foreach ($path in $Assets) {
    Resize-Image -InputPath $path -OutputPath $path -Width 32 -Height 32
}
