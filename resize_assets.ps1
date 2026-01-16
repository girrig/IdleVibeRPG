Add-Type -AssemblyName System.Drawing

$SourceDir = "raw_assets"
$DestDir = "src/assets"
$TargetSize = 32

if (-not (Test-Path $DestDir)) {
    New-Item -ItemType Directory -Force -Path $DestDir
}

$files = Get-ChildItem -Path $SourceDir -Filter "*.png"

foreach ($file in $files) {
    $inputPath = $file.FullName
    $outputPath = Join-Path $DestDir $file.Name
    
    Write-Host "Processing $($file.Name)..."
    
    try {
        $srcImage = [System.Drawing.Bitmap]::FromFile($inputPath)
        $newImage = New-Object System.Drawing.Bitmap($TargetSize, $TargetSize)
        $g = [System.Drawing.Graphics]::FromImage($newImage)
        
        # Use NearestNeighbor for pixel art scaling
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $g.DrawImage($srcImage, 0, 0, $TargetSize, $TargetSize)
        
        $newImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $g.Dispose()
        $newImage.Dispose()
        $srcImage.Dispose()
    }
    catch {
        Write-Error "Failed to resize $($file.Name): $_"
    }
}

Write-Host "Done resizing assets."
