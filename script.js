class ImageEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.scale = 1;
        this.rotation = 0;
        this.flipX = 1;
        this.flipY = 1;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.imageX = 0;
        this.imageY = 0;
        this.lastTouchDistance = 0;

        this.initializeCanvas();
        this.setupEventListeners();
    }

    initializeCanvas() {
        this.setCanvasSize(512, 512);
    }

    setCanvasSize(width, height) {
        const maxDisplaySize = 512;
        const aspectRatio = width / height;
        const container = this.canvas.parentElement;
        
        // 设置容器的宽高比
        container.style.aspectRatio = `${width} / ${height}`;
        
        // 根据宽高比调整显示大小
        if (width > height) {
            const displayWidth = Math.min(width, maxDisplaySize);
            const displayHeight = displayWidth / aspectRatio;
            container.style.width = displayWidth + 'px';
            container.style.height = displayHeight + 'px';
        } else {
            const displayHeight = Math.min(height, maxDisplaySize);
            const displayWidth = displayHeight * aspectRatio;
            container.style.width = displayWidth + 'px';
            container.style.height = displayHeight + 'px';
        }

        // 设置实际画布大小
        this.canvas.width = width;
        this.canvas.height = height;
        document.getElementById('currentResolution').textContent = `${width} x ${height}`;
        this.drawImage();
    }

    setupEventListeners() {
        // 文件拖放
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        // 鼠标事件
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 考虑旋转角度的影响
            const rotationRad = (this.rotation * Math.PI) / 180;
            const cos = Math.cos(rotationRad);
            const sin = Math.sin(rotationRad);
            
            // 保存起始点，考虑旋转和镜像的影响
            this.startX = x * cos + y * sin;
            this.startY = -x * sin + y * cos;
            
            // 考虑镜像的影响
            this.startX *= this.flipX;
            this.startY *= this.flipY;
            
            // 保存当前图片位置
            this.lastImageX = this.imageX;
            this.lastImageY = this.imageY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // 考虑旋转角度的影响
            const rotationRad = (this.rotation * Math.PI) / 180;
            const cos = Math.cos(rotationRad);
            const sin = Math.sin(rotationRad);
            
            // 计算当前点，考虑旋转和镜像的影响
            const currentX = (x * cos + y * sin) * this.flipX;
            const currentY = (-x * sin + y * cos) * this.flipY;
            
            // 计算位移
            const deltaX = currentX - this.startX;
            const deltaY = currentY - this.startY;
            
            // 更新图片位置
            this.imageX = this.lastImageX + deltaX;
            this.imageY = this.lastImageY + deltaY;
            
            this.drawImage();
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // 滚轮缩放
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= delta;
            this.drawImage();
        });

        // 预设分辨率按钮
        document.querySelectorAll('[data-resolution], [data-resolution-width]').forEach(button => {
            button.addEventListener('click', () => {
                if (button.dataset.resolution) {
                    // 正方形分辨率
                    const size = parseInt(button.dataset.resolution);
                    this.setCanvasSize(size, size);
                } else {
                    // 自定义宽高比分辨率
                    const width = parseInt(button.dataset.resolutionWidth);
                    const height = parseInt(button.dataset.resolutionHeight);
                    this.setCanvasSize(width, height);
                }
            });
        });

        // 宽高比按钮
        document.querySelectorAll('[data-aspect]').forEach(button => {
            button.addEventListener('click', () => {
                const [w, h] = button.dataset.aspect.split(':').map(Number);
                const newHeight = Math.round(this.canvas.width * (h / w));
                this.setCanvasSize(this.canvas.width, newHeight);
            });
        });

        // 自定义分辨率
        document.getElementById('setResolution').addEventListener('click', () => {
            const width = parseInt(document.getElementById('widthInput').value);
            const height = parseInt(document.getElementById('heightInput').value);
            if (width > 0 && height > 0) {
                this.setCanvasSize(width, height);
            }
        });

        // 图片操作按钮
        document.getElementById('rotateLeft').addEventListener('click', () => {
            this.rotation -= 90;
            this.drawImage();
        });

        document.getElementById('rotateRight').addEventListener('click', () => {
            this.rotation += 90;
            this.drawImage();
        });

        document.getElementById('zoomIn').addEventListener('click', () => {
            this.scale += 1 / Math.max(this.image.width, this.image.height);
            this.drawImage();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            this.scale -= 1 / Math.max(this.image.width, this.image.height);
            if (this.scale < 0.1) this.scale = 0.1;
            this.drawImage();
        });

        document.getElementById('flipHorizontal').addEventListener('click', () => {
            this.flipX *= -1;
            this.drawImage();
        });

        document.getElementById('flipVertical').addEventListener('click', () => {
            this.flipY *= -1;
            this.drawImage();
        });

        // 复制到剪贴板
        document.getElementById('copyToClipboard').addEventListener('click', () => {
            this.canvas.toBlob(blob => {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]);
            });
        });

        // 下载图片
        document.getElementById('downloadImage').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'cropped-image.png';
            link.href = this.canvas.toDataURL();
            link.click();
        });

        // 主题切换
        document.getElementById('toggleTheme').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('light-mode');
        });

        // 添加触摸事件支持
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // 双指触摸，记录初始距离用于缩放
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                this.lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
            } else if (e.touches.length === 1) {
                // 单指触摸，用于移动
                this.isDragging = true;
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                const rotationRad = (this.rotation * Math.PI) / 180;
                const cos = Math.cos(rotationRad);
                const sin = Math.sin(rotationRad);
                
                this.startX = x * cos + y * sin;
                this.startY = -x * sin + y * cos;
                
                this.startX *= this.flipX;
                this.startY *= this.flipY;
                
                this.lastImageX = this.imageX;
                this.lastImageY = this.imageY;
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // 双指缩放
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                if (this.lastTouchDistance > 0) {
                    const scale = currentDistance / this.lastTouchDistance;
                    this.scale *= scale;
                    this.drawImage();
                }

                this.lastTouchDistance = currentDistance;
            } else if (e.touches.length === 1 && this.isDragging) {
                // 单指移动
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                const rotationRad = (this.rotation * Math.PI) / 180;
                const cos = Math.cos(rotationRad);
                const sin = Math.sin(rotationRad);
                
                const currentX = (x * cos + y * sin) * this.flipX;
                const currentY = (-x * sin + y * cos) * this.flipY;
                
                const deltaX = currentX - this.startX;
                const deltaY = currentY - this.startY;
                
                this.imageX = this.lastImageX + deltaX;
                this.imageY = this.lastImageY + deltaY;
                
                this.drawImage();
            }
        });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
            this.lastTouchDistance = 0;
        });

        this.canvas.addEventListener('touchcancel', () => {
            this.isDragging = false;
            this.lastTouchDistance = 0;
        });
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.loadImage(file);
        }
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.scale = 1;
                this.rotation = 0;
                this.flipX = 1;
                this.flipY = 1;
                this.imageX = 0;
                this.imageY = 0;
                this.fitImageToCanvas();
                document.getElementById('drop-zone').style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    fitImageToCanvas() {
        if (!this.image) return;
        
        const canvasRatio = this.canvas.width / this.canvas.height;
        const imageRatio = this.image.width / this.image.height;

        if (imageRatio > canvasRatio) {
            this.scale = this.canvas.width / this.image.width;
        } else {
            this.scale = this.canvas.height / this.image.height;
        }

        this.drawImage();
    }

    drawImage() {
        if (!this.image) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        // 移动到画布中心
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        
        // 应用变换
        this.ctx.rotate((this.rotation * Math.PI) / 180);
        this.ctx.scale(this.scale * this.flipX, this.scale * this.flipY);
        
        // 绘制图片
        this.ctx.drawImage(
            this.image,
            -this.image.width / 2 + this.imageX / this.scale,
            -this.image.height / 2 + this.imageY / this.scale,
            this.image.width,
            this.image.height
        );

        this.ctx.restore();
    }
}

// 在文件开头添加比例计算器类
class ProportionCalculator {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('valueC').addEventListener('input', () => this.calculateFromC());
        document.getElementById('valueD').addEventListener('input', () => this.calculateFromD());
    }

    calculateFromC() {
        const a = parseFloat(document.getElementById('valueA').value);
        const b = parseFloat(document.getElementById('valueB').value);
        const c = parseFloat(document.getElementById('valueC').value);
        
        if(isNaN(a) || isNaN(b) || isNaN(c)) {
            return;
        }
        
        if(b === 0 || a === 0) {
            alert('分母不能为0！');
            return;
        }
        
        const d = Math.round((b * c) / a);
        document.getElementById('valueD').value = d;
    }

    calculateFromD() {
        const a = parseFloat(document.getElementById('valueA').value);
        const b = parseFloat(document.getElementById('valueB').value);
        const d = parseFloat(document.getElementById('valueD').value);
        
        if(isNaN(a) || isNaN(b) || isNaN(d)) {
            return;
        }
        
        if(b === 0 || a === 0) {
            alert('分母不能为0！');
            return;
        }
        
        const c = Math.round((a * d) / b);
        document.getElementById('valueC').value = c;
    }
}

// 在文件末尾添加功能切换逻辑
window.addEventListener('DOMContentLoaded', () => {
    const imageEditor = new ImageEditor();
    const calculator = new ProportionCalculator();

    // 功能切换按钮
    const switchToEditor = document.getElementById('switchToEditor');
    const switchToCalculator = document.getElementById('switchToCalculator');
    const editorPanel = document.getElementById('imageEditor');
    const calculatorPanel = document.getElementById('calculator');

    switchToEditor.addEventListener('click', () => {
        switchToEditor.classList.add('active');
        switchToCalculator.classList.remove('active');
        editorPanel.classList.add('active');
        calculatorPanel.classList.remove('active');
    });

    switchToCalculator.addEventListener('click', () => {
        switchToCalculator.classList.add('active');
        switchToEditor.classList.remove('active');
        calculatorPanel.classList.add('active');
        editorPanel.classList.remove('active');
    });

    // 检查并恢复上次的主题设置
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else if (localStorage.getItem('darkMode') === 'false') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }
}); 