Add-Type -AssemblyName System.Drawing
$assetRoot = Split-Path $PSScriptRoot -Parent
$cream = [Drawing.ColorTranslator]::FromHtml('#f7f0df')
$cherry = [Drawing.ColorTranslator]::FromHtml('#a72f45')
$ink = [Drawing.ColorTranslator]::FromHtml('#332b2b')
function Draw-Calendar($g, $x, $y, $size) {
    $state = $g.Save()
    $g.TranslateTransform($x, $y)
    $g.ScaleTransform(($size / 96), ($size / 96))
    $paper = New-Object Drawing.SolidBrush ([Drawing.ColorTranslator]::FromHtml('#fffaf0'))
    $brush = New-Object Drawing.SolidBrush $cherry
    $pen = New-Object Drawing.Pen $cherry, 5
    $g.FillRectangle($paper, 18, 24, 60, 56)
    $g.DrawRectangle($pen, 18, 24, 60, 56)
    $g.DrawLine($pen, 18, 39, 78, 39)
    $g.DrawLine($pen, 33, 17, 33, 31)
    $g.DrawLine($pen, 63, 17, 63, 31)
    $heart = New-Object Drawing.Drawing2D.GraphicsPath
    $heart.AddBezier(48, 69, 12, 45, 35, 36, 48, 48)
    $heart.AddBezier(48, 48, 61, 36, 84, 45, 48, 69)
    $g.FillPath($brush, $heart)
    $heart.Dispose(); $pen.Dispose(); $brush.Dispose(); $paper.Dispose()
    $g.Restore($state)
}
foreach ($entry in @(@('favicon-96.png',96),@('apple-touch-icon.png',180),@('icon-192.png',192),@('icon-512.png',512))) {
    $size = [int]$entry[1]
    $bitmap = New-Object Drawing.Bitmap $size, $size
    $g = [Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = 'AntiAlias'
    $g.Clear($cream)
    Draw-Calendar $g 0 0 $size
    $bitmap.Save((Join-Path $assetRoot $entry[0]), [Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bitmap.Dispose()
}
$bitmap = New-Object Drawing.Bitmap 1200, 630
$g = [Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear($cream)
$pen = New-Object Drawing.Pen $cherry, 2
$g.DrawRectangle($pen, 24, 24, 1152, 582)
$brush = New-Object Drawing.SolidBrush $cherry
$dark = New-Object Drawing.SolidBrush $ink
$small = New-Object Drawing.Font 'Arial', 21, ([Drawing.FontStyle]::Regular)
$label = New-Object Drawing.Font 'Arial', 25, ([Drawing.FontStyle]::Bold)
$title = New-Object Drawing.Font 'Georgia', 74, ([Drawing.FontStyle]::Regular)
$g.DrawString('pick a date', $label, $brush, 65, 63)
$g.DrawString('a little more us.', $title, $dark, 60, 163)
$g.DrawString('Date invitations. A little surprise.', $small, $dark, 68, 320)
$g.DrawString('A scrapbook of your favourite days.', $small, $dark, 68, 362)
$g.DrawString('free to use / made for two', $small, $brush, 68, 516)
Draw-Calendar $g 870 200 245
$g.DrawString('suratwala.in', $small, $brush, 907, 516)
$bitmap.Save((Join-Path $assetRoot 'share-card.png'), [Drawing.Imaging.ImageFormat]::Png)
foreach ($item in @($g,$bitmap,$pen,$brush,$dark,$small,$label,$title)) {$item.Dispose()}
