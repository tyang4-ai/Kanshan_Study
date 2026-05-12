# Crop 刘看山 front view from the four-view sheet → app/public/foxes/shan-portrait.png
Add-Type -AssemblyName System.Drawing
$src = "C:\Users\22317\Documents\Coding\Hackathon Stuff\Zhihu hackathon\Documents\刘看山 IP 形象3D+平面\刘看山3d+平面\刘看山四视图.png"
$dst = "C:\Users\22317\Documents\Coding\Hackathon Stuff\Zhihu hackathon\app\public\foxes\shan-portrait.png"

$img = [System.Drawing.Image]::FromFile($src)
Write-Host ("Source: W=" + $img.Width + " H=" + $img.Height)

# Auto-detect 2x2 grid layout. 四视图 = 4 views in a 2x2 (front/side/back/three-quarter).
# Front view is conventionally the top-left quadrant.
$qw = [int]($img.Width / 2)
$qh = [int]($img.Height / 2)
$cropX = 0
$cropY = 0

$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $qw, $qh)
$bmp  = New-Object System.Drawing.Bitmap($qw, $qh)
$g    = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $qw, $qh)), $rect, [System.Drawing.GraphicsUnit]::Pixel)

# Now downscale to 256x256 transparent PNG (keeping aspect via fit)
$out = New-Object System.Drawing.Bitmap(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2  = [System.Drawing.Graphics]::FromImage($out)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.Clear([System.Drawing.Color]::Transparent)

# Fit-contain
$srcRatio = $qw / $qh
$dstRatio = 1.0
if ($srcRatio -gt $dstRatio) {
    $newW = 256
    $newH = [int](256 / $srcRatio)
    $offX = 0
    $offY = [int]((256 - $newH) / 2)
} else {
    $newH = 256
    $newW = [int](256 * $srcRatio)
    $offX = [int]((256 - $newW) / 2)
    $offY = 0
}
$g2.DrawImage($bmp, (New-Object System.Drawing.Rectangle($offX, $offY, $newW, $newH)))

$out.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$g2.Dispose()
$bmp.Dispose()
$out.Dispose()
$img.Dispose()
Write-Host ("Saved: " + $dst)
