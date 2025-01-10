// 添加移动设备检测函数
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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
        this.isRotationMode = false;

        this.initializeCanvas();
        this.setupEventListeners();
    }

    initializeCanvas() {
        // 根据设备类型设置不同的默认分辨率
        if (isMobileDevice()) {
            this.setCanvasSize(384, 288);
        } else {
            this.setCanvasSize(512, 384);
        }
    }

    setCanvasSize(width, height) {
        // 根据设备类型设置不同的最大显示尺寸
        const maxDisplaySize = isMobileDevice() ? 384 : 512;
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
            if (e.ctrlKey) {
                // Ctrl + 鼠标左键用于旋转
                this.isDragging = true;
                this.isRotating = true;
                const rect = this.canvas.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                this.startAngle = Math.atan2(
                    e.clientY - rect.top - centerY,
                    e.clientX - rect.left - centerX
                );
                this.lastRotation = this.rotation;
            } else {
                // 普通拖拽
                this.isDragging = true;
                this.isRotating = false;
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
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            if (this.isRotating) {
                // 旋转模式
                const rect = this.canvas.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const currentAngle = Math.atan2(
                    e.clientY - rect.top - centerY,
                    e.clientX - rect.left - centerX
                );
                const angleDiff = (currentAngle - this.startAngle) * (180 / Math.PI);
                this.rotation = this.lastRotation + angleDiff;
                this.drawImage();
            } else {
                // 普通拖拽模式
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
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isRotating = false;
        });

        // 滚轮缩放
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const oldScale = this.scale;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= delta;
            
            // 调整图片位置以保持画布中心缩放
            const scaleRatio = this.scale / oldScale;
            this.imageX *= scaleRatio;
            this.imageY *= scaleRatio;
            
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
            const oldScale = this.scale;
            this.scale += 0.001;
            
            // 调整图片位置以保持画布中心缩放
            const scaleRatio = this.scale / oldScale;
            this.imageX *= scaleRatio;
            this.imageY *= scaleRatio;
            
            this.drawImage();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            const oldScale = this.scale;
            this.scale -= 0.001;
            if (this.scale < 0.1) this.scale = 0.1;
            
            // 调整图片位置以保持画布中心缩放
            const scaleRatio = this.scale / oldScale;
            this.imageX *= scaleRatio;
            this.imageY *= scaleRatio;
            
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
            const now = new Date();
            now.setHours(now.getHours() + 8); // 调整为北京时间
            const formattedDate = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
            link.download = `cropped_image_${formattedDate}`;
            link.href = this.canvas.toDataURL();
            link.click();
        });

        // 主题切换
        document.getElementById('toggleTheme').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('light-mode');
        });

        // 添加旋转模式切换按钮事件
        const rotationModeToggle = document.getElementById('rotationModeToggle');
        if (rotationModeToggle) {
            rotationModeToggle.addEventListener('click', () => {
                this.isRotationMode = !this.isRotationMode;
                rotationModeToggle.classList.toggle('active');
            });
        }

        // 修改触摸事件
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                // 双指触摸，记录初始信息
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                this.lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                if (this.isRotationMode) {
                    // 在旋转模式下，记录初始角度
                    this.startAngle = Math.atan2(
                        touch2.clientY - touch1.clientY,
                        touch2.clientX - touch1.clientX
                    );
                    this.lastRotation = this.rotation;
                }
            } else if (e.touches.length === 1) {
                // 单指触摸逻辑保持不变
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
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                if (this.isRotationMode) {
                    // 旋转模式：双指旋转
                    const currentAngle = Math.atan2(
                        touch2.clientY - touch1.clientY,
                        touch2.clientX - touch1.clientX
                    );
                    const angleDiff = (currentAngle - this.startAngle) * (180 / Math.PI);
                    this.rotation = this.lastRotation + angleDiff;
                } else {
                    // 缩放模式：双指缩放
                    if (this.lastTouchDistance > 0) {
                        const scale = currentDistance / this.lastTouchDistance;
                        this.scale *= scale;
                    }
                }
                this.drawImage();
                this.lastTouchDistance = currentDistance;
            } else if (e.touches.length === 1 && this.isDragging) {
                // 单指移动逻辑保持不变
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
        // 根据设备类型设置不同的默认值
        if (isMobileDevice()) {
            document.getElementById('valueC').value = '384';
            document.getElementById('valueD').value = '288';
        }
        // A和B的值保持4:3不变
        document.getElementById('valueA').value = '4';
        document.getElementById('valueB').value = '3';
        
        this.setupEventListeners();
        // 初始化时就计算一次
        this.calculateFromC();
        // 初始化时就更新裁剪界面的分辨率
        this.updateCropResolution();
    }

    setupEventListeners() {
        document.getElementById('valueC').addEventListener('input', () => {
            this.calculateFromC();
            this.updateCropResolution();
        });
        
        document.getElementById('valueD').addEventListener('input', () => {
            this.calculateFromD();
            this.updateCropResolution();
        });
        
        // 添加比例按钮点击事件
        document.querySelectorAll('.ratio-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const ratio = e.target.dataset.ratio;
                const [a, b] = ratio.split(':').map(Number);
                document.getElementById('valueA').value = a;
                document.getElementById('valueB').value = b;
                // 清空 C 和 D 的值
                document.getElementById('valueC').value = '';
                document.getElementById('valueD').value = '';
            });
        });
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

    // 添加新方法：更新裁剪界面的分辨率输入框
    updateCropResolution() {
        const widthInput = document.getElementById('widthInput');
        const heightInput = document.getElementById('heightInput');
        const valueC = document.getElementById('valueC').value;
        const valueD = document.getElementById('valueD').value;
        
        if (valueC && valueD) {
            widthInput.value = valueC;
            heightInput.value = valueD;
        }
    }
}

// 在文件末尾添加功能切换逻辑
window.addEventListener('DOMContentLoaded', () => {
    // 检测是否是微信浏览器
    function isWechatBrowser() {
        const ua = navigator.userAgent.toLowerCase();
        return /micromessenger/.test(ua) && /mobile/.test(ua);
    }

    // 显示或隐藏微信浏览器提示
    const wechatBrowserTip = document.getElementById('wechatBrowserTip');
    if (isWechatBrowser()) {
        wechatBrowserTip.style.display = 'block';
    }

    const imageEditor = new ImageEditor();
    const calculator = new ProportionCalculator();

    // 功能切换按钮
    const importImage = document.getElementById('importImage');
    const switchToEditor = document.getElementById('switchToEditor');
    const switchToCalculator = document.getElementById('switchToCalculator');
    const languageToggle = document.getElementById('languageToggle');
    const editorPanel = document.getElementById('imageEditor');
    const calculatorPanel = document.getElementById('calculator');

    // 导入图片按钮点击事件
    importImage.addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    switchToEditor.addEventListener('click', () => {
        switchToEditor.classList.add('active');
        switchToCalculator.classList.remove('active');
        editorPanel.classList.add('active');
        calculatorPanel.classList.remove('active');
        importImage.style.display = 'inline-block'; // 显示导入图片按钮
    });

    switchToCalculator.addEventListener('click', () => {
        switchToCalculator.classList.add('active');
        switchToEditor.classList.remove('active');
        calculatorPanel.classList.add('active');
        editorPanel.classList.remove('active');
        importImage.style.display = 'none'; // 隐藏导入图片按钮
    });

    // 语言切换按钮点击事件
    languageToggle.addEventListener('click', () => {
        if (languageToggle.textContent === 'ZH') {
            languageToggle.textContent = 'EN';
            document.body.classList.add('en-mode');
            document.querySelectorAll('[data-lang-zh]').forEach(el => {
                el.textContent = el.getAttribute('data-lang-en');
            });
        } else {
            languageToggle.textContent = 'ZH';
            document.body.classList.remove('en-mode');
            document.querySelectorAll('[data-lang-zh]').forEach(el => {
                el.textContent = el.getAttribute('data-lang-zh');
            });
        }
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