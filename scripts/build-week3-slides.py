# 已改為通用腳本：python3 scripts/build-slides.py --source docs/WEEK3_SLIDES_SOURCE.json --out materials/Week3_教學簡報.pptx
# 範本固定是 materials/_slide_template.pptx（Week 2 原始版面），所以重建 Week 2 自己也安全。
import subprocess, sys
sys.exit(subprocess.call([sys.executable, 'scripts/build-slides.py', '--source', 'docs/WEEK3_SLIDES_SOURCE.json', '--out', 'materials/Week3_教學簡報.pptx']))
