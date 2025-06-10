document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');

    // コントロール要素
    const kSlider = document.getElementById('k-slider');
    const kValueSpan = document.getElementById('k-value');
    const radicalAxisToggle = document.getElementById('radical-axis-toggle');
    const baseCirclesToggle = document.getElementById('base-circles-toggle');
    const infoDetails = document.getElementById('info-details');
    const legendDetails = document.getElementById('legend-details');

    // 色の定義
    const C1_COLOR = '#007BFF';
    const C2_COLOR = '#00BFFF';
    const PENCIL_COLOR = '#DC3545';
    const RADICAL_AXIS_COLOR = '#28A745';
    const GRID_COLOR = '#e9ecef';
    const POINT_COLOR = '#343a40';

    let circle1, circle2;
    let dragging = null;
    let lastMousePos = { x: 0, y: 0 };

    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        // 親コンテナの幅と高さから小さい方を基準にサイズを決定
        const size = Math.min(container.clientWidth, container.clientHeight, 800);
        canvas.width = size;
        canvas.height = size;
        if (!circle1) initCircles();
        draw();
    }

    function initCircles() {
        const w = canvas.width;
        const h = canvas.height;
        circle1 = { x: w * 0.35, y: h * 0.5, r: w * 0.15, color: C1_COLOR };
        circle2 = { x: w * 0.65, y: h * 0.5, r: w * 0.20, color: C2_COLOR };
    }

    function draw() {
        requestAnimationFrame(() => {
            const k = parseFloat(kSlider.value);
            kValueSpan.textContent = k.toFixed(2);
            const showRadicalAxis = radicalAxisToggle.checked;
            const showBaseCircles = baseCirclesToggle.checked;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();

            // 円の束とラジカル軸の計算に使う基底円のパラメータを決定
            // showBaseCirclesがfalseの時は半径0の点円として扱う
            const baseCircle1 = { x: circle1.x, y: circle1.y, r: showBaseCircles ? circle1.r : 0 };
            const baseCircle2 = { x: circle2.x, y: circle2.y, r: showBaseCircles ? circle2.r : 0 };
            
            const p1 = getCircleParams(baseCircle1);
            const p2 = getCircleParams(baseCircle2);

            if (showRadicalAxis) {
                drawRadicalAxis(p1, p2);
            }

            // 円の束のメンバーを計算して描画: (1-k)S1 + kS2 = 0
            const g_k = (1 - k) * p1.g + k * p2.g;
            const f_k = (1 - k) * p1.f + k * p2.f;
            const c_k = (1 - k) * p1.c + k * p2.c;

            const centerX = -g_k;
            const centerY = -f_k;
            const radiusSq = centerX * centerX + centerY * centerY - c_k;

            if (radiusSq >= 0) { // 虚円でない場合のみ描画
                const radius = Math.sqrt(radiusSq);
                drawCircle(centerX, centerY, radius, PENCIL_COLOR, 2.5);
                drawPoint(centerX, centerY, PENCIL_COLOR);
            }
            
            // 基底円を描画（または中心点のみ描画）
            if (showBaseCircles) {
                drawCircle(circle1.x, circle1.y, circle1.r, circle1.color, 3);
                drawCircle(circle2.x, circle2.y, circle2.r, circle2.color, 3);
            }
            // 基底円の中心点は常に表示
            drawPoint(circle1.x, circle1.y, POINT_COLOR);
            drawPoint(circle2.x, circle2.y, POINT_COLOR);
        });
    }

    // S = x^2 + y^2 + 2gx + 2fy + c = 0 のパラメータを計算
    function getCircleParams(circle) {
        return {
            g: -circle.x,
            f: -circle.y,
            c: circle.x * circle.x + circle.y * circle.y - circle.r * circle.r
        };
    }

    // --- 描画ヘルパー関数 ---
    function drawCircle(x, y, r, color, lineWidth = 2) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
    
    function drawPoint(x, y, color) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    
    function drawGrid() {
        const step = canvas.width / 20; // グリッドを細かく
        ctx.beginPath();
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += step) {
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y <= canvas.height; y += step) {
            ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }

    // ラジカル軸を描画: 2(g1-g2)x + 2(f1-f2)y + (c1-c2) = 0
    function drawRadicalAxis(p1, p2) {
        const a = 2 * (p1.g - p2.g);
        const b = 2 * (p1.f - p2.f);
        const c = p1.c - p2.c;

        ctx.beginPath();
        ctx.strokeStyle = RADICAL_AXIS_COLOR;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);

        if (Math.abs(b) > 1e-6) {
            const y1 = (-c - a * 0) / b;
            const y2 = (-c - a * canvas.width) / b;
            ctx.moveTo(0, y1); ctx.lineTo(canvas.width, y2);
        } else if (Math.abs(a) > 1e-6) {
            const x = -c / a;
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // --- イベントハンドラ ---
    function getEventPosition(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function handleStart(e) {
        e.preventDefault();
        const pos = getEventPosition(e);
        lastMousePos = pos;
        
        const dist1 = Math.hypot(pos.x - circle1.x, pos.y - circle1.y);
        const dist2 = Math.hypot(pos.x - circle2.x, pos.y - circle2.y);

        if (Math.abs(dist1 - circle1.r) < 15 && baseCirclesToggle.checked) dragging = 'radius1';
        else if (Math.abs(dist2 - circle2.r) < 15 && baseCirclesToggle.checked) dragging = 'radius2';
        else if (dist1 < 15) dragging = 'center1';
        else if (dist2 < 15) dragging = 'center2';
        else dragging = null;

        if (dragging) canvas.style.cursor = 'grabbing';
    }

    function handleMove(e) {
        if (!dragging) return;
        e.preventDefault();
        const pos = getEventPosition(e);

        if (dragging === 'center1') {
            circle1.x += pos.x - lastMousePos.x;
            circle1.y += pos.y - lastMousePos.y;
        } else if (dragging === 'center2') {
            circle2.x += pos.x - lastMousePos.x;
            circle2.y += pos.y - lastMousePos.y;
        } else if (dragging === 'radius1') {
            circle1.r = Math.max(5, Math.hypot(pos.x - circle1.x, pos.y - circle1.y));
        } else if (dragging === 'radius2') {
            circle2.r = Math.max(5, Math.hypot(pos.x - circle2.x, pos.y - circle2.y));
        }

        lastMousePos = pos;
        draw();
    }

    function handleEnd() {
        dragging = null;
        canvas.style.cursor = 'grab';
    }

    // 画面サイズに応じてUIを調整
    function handleLayout() {
        const isSmallScreen = window.innerWidth <= 900;
        infoDetails.open = !isSmallScreen;
        legendDetails.open = !isSmallScreen;
    }

    // イベントリスナー設定
    kSlider.addEventListener('input', draw);
    radicalAxisToggle.addEventListener('change', draw);
    baseCirclesToggle.addEventListener('change', draw);

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('mouseleave', handleEnd);

    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    window.addEventListener('resize', () => {
        resizeCanvas();
        handleLayout();
    });

    // 初期化と初回描画
    resizeCanvas();
    handleLayout();
});