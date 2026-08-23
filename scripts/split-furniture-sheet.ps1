param(
    [string]$Source = "$PSScriptRoot\..\public\assets\furniture\cozy-oak-furniture-set-v1.png",
    [string]$OutputDirectory = "$PSScriptRoot\..\public\assets\furniture"
)

Add-Type -AssemblyName System.Drawing

$regions = [ordered]@{
    "bed-oak-ne"       = [System.Drawing.Rectangle]::new(0, 0, 535, 565)
    "desk-oak-ne"      = [System.Drawing.Rectangle]::new(520, 55, 470, 520)
    "chair-oak-ne"     = [System.Drawing.Rectangle]::new(950, 135, 290, 455)
    "bookshelf-oak-ne" = [System.Drawing.Rectangle]::new(1200, 0, 336, 590)
    "plant-leafy-ne"   = [System.Drawing.Rectangle]::new(0, 520, 370, 504)
    "lamp-teal-ne"     = [System.Drawing.Rectangle]::new(370, 540, 330, 484)
    "rug-teal-ne"      = [System.Drawing.Rectangle]::new(620, 550, 585, 474)
    "cabinet-oak-ne"   = [System.Drawing.Rectangle]::new(1170, 540, 366, 484)
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$sourceImage = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source))

foreach ($entry in $regions.GetEnumerator()) {
    $region = $entry.Value
    $left = $region.Right
    $top = $region.Bottom
    $right = $region.Left
    $bottom = $region.Top

    for ($y = $region.Top; $y -lt $region.Bottom; $y++) {
        for ($x = $region.Left; $x -lt $region.Right; $x++) {
            if ($sourceImage.GetPixel($x, $y).A -gt 20) {
                if ($x -lt $left) { $left = $x }
                if ($x -gt $right) { $right = $x }
                if ($y -lt $top) { $top = $y }
                if ($y -gt $bottom) { $bottom = $y }
            }
        }
    }

    $padding = 12
    $left = [Math]::Max($region.Left, $left - $padding)
    $top = [Math]::Max($region.Top, $top - $padding)
    $right = [Math]::Min($region.Right - 1, $right + $padding)
    $bottom = [Math]::Min($region.Bottom - 1, $bottom + $padding)
    $crop = [System.Drawing.Rectangle]::new($left, $top, $right - $left + 1, $bottom - $top + 1)
    $asset = $sourceImage.Clone($crop, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $asset.Save((Join-Path $OutputDirectory "$($entry.Key).png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $asset.Dispose()
}

$sourceImage.Dispose()
