param([string]$OutDir)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$slides=@(@('Skill and Agent','AI methods and executors'),@('Why Skill and Agent','Repeat complex work with rules'),@('Skill packaged prompt','AI follows a defined process'),@('How to make a Skill','Goal -> rules -> tools -> test'),@('Agent executes the goal','Understand, choose Skill, use tools'),@('Agent in a project folder','AGENTS.md + Skill + agents/'),@('Skill and Agent together','Skill gives method; Agent executes'))
for($i=0;$i -lt $slides.Count;$i++){ $bmp=New-Object Drawing.Bitmap 1600,900; $g=[Drawing.Graphics]::FromImage($bmp); $g.Clear([Drawing.Color]::FromArgb(10,25,48)); $f1=[Drawing.Font]::new('Arial',42,[Drawing.FontStyle]::Bold); $f2=[Drawing.Font]::new('Arial',26); $g.DrawString($slides[$i][0],$f1,[Drawing.Brushes]::White,150,180); $g.DrawString($slides[$i][1],$f2,[Drawing.Brushes]::Gold,155,310); $g.Dispose(); $bmp.Save((Join-Path $OutDir ('slide-{0:D2}.png' -f $i)),[Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose() }

