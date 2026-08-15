param(
  [Parameter(Mandatory=$true)][string]$Output,
  [Parameter(Mandatory=$true)][string]$Label,
  [Parameter(Mandatory=$true)][string]$Caption,
  [Parameter(Mandatory=$false)][string]$Background="E4F3F0",
  [Parameter(Mandatory=$false)][string]$Dominant="1F7A6D",
  [Parameter(Mandatory=$false)][string]$Accent="E4572E",
  [Parameter(Mandatory=$false)][string]$Ink="23261F"
)
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 1600,900
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
function HexColor([string]$h){ if($h.StartsWith('#')){$h=$h.Substring(1)}; return [System.Drawing.ColorTranslator]::FromHtml('#'+$h) }
$g.Clear((HexColor $Background))
$dark=HexColor $Ink
$accent=HexColor $Accent
$light=HexColor 'FFFFFF'
$node=HexColor $Dominant
$g.FillRectangle(([System.Drawing.SolidBrush]::new($light)),900,185,640,510)
$g.DrawRectangle((New-Object System.Drawing.Pen $dark,2),900,185,640,510)
$g.DrawString('VISUAL FOCUS',([System.Drawing.Font]::new('Arial',20,[System.Drawing.FontStyle]::Bold)),([System.Drawing.SolidBrush]::new($accent)),942,230)
$font = [System.Drawing.Font]::new('Microsoft JhengHei',22,[System.Drawing.FontStyle]::Bold)
$small = [System.Drawing.Font]::new('Microsoft JhengHei',20)
foreach($x in @(960,1160,1360)){
  $g.FillEllipse(([System.Drawing.SolidBrush]::new($node)),$x,355,140,140)
  $g.DrawEllipse((New-Object System.Drawing.Pen $dark,2),$x,355,140,140)
}
$g.DrawString('文件', $font, ([System.Drawing.SolidBrush]::new($dark)), 1008,398)
$g.DrawString('AI', $font, ([System.Drawing.SolidBrush]::new($dark)), 1213,398)
$g.DrawString('人工', $font, ([System.Drawing.SolidBrush]::new($dark)), 1393,398)
$arrow = [System.Drawing.Font]::new('Arial',40,[System.Drawing.FontStyle]::Bold)
$g.DrawString(([char]0x2192),$arrow,([System.Drawing.SolidBrush]::new($accent)),1103,397)
$g.DrawString(([char]0x2192),$arrow,([System.Drawing.SolidBrush]::new($accent)),1303,397)
$g.DrawString(([char]0x2192),$arrow,([System.Drawing.SolidBrush]::new($accent)),1103,397)
$g.DrawString(([char]0x2192),$arrow,([System.Drawing.SolidBrush]::new($accent)),1303,397)
$g.DrawLine((New-Object System.Drawing.Pen $dark,1),942,565,1495,565)
$rect = New-Object System.Drawing.RectangleF 942,590,540,85
$g.DrawString($Caption,$small,([System.Drawing.SolidBrush]::new($dark)),$rect)
$g.DrawString($Label,([System.Drawing.Font]::new('Arial',68,[System.Drawing.FontStyle]::Bold)),(New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(50,23,59,50))),1360,770)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($Output)) | Out-Null
$bmp.Save($Output,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$bmp.Dispose()

