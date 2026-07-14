// المسار النسبي للملف داخل مستودعك
const url = './sala.pdf'; 

let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null,
    scale = 1.25,
    canvas = document.getElementById('pdf-render'),
    ctx = canvas.getContext('2d'),
    textLayerDiv = document.getElementById('text-layer');

// إعداد مسار الـ Worker لمعالجة الملف في الخلفية
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

const renderPage = num => {
    pageIsRendering = true;

    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const pageContainer = document.getElementById('page-container');
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;

        const renderCtx = {
            canvasContext: ctx,
            viewport: viewport
        };

        const renderTask = page.render(renderCtx);

        renderTask.promise.then(() => {
            pageIsRendering = false;
            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
            
            // بناء طبقة النصوص (Text Layer) لتمكين النسخ
            return page.getTextContent();
        }).then(textContent => {
            textLayerDiv.innerHTML = ''; 
            pdfjsLib.renderTextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });
        });
    });

    document.getElementById('page-num').value = num;
};

const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
};

const showPrevPage = () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
};

const showNextPage = () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
};

// تحميل مستند الـ PDF
pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = `/ ${pdfDoc.numPages}`;
    renderPage(pageNum);
}).catch(err => {
    console.error("خطأ في تحميل ملف PDF: ", err);
});

// أحداث شريط الأدوات
document.getElementById('prev-page').addEventListener('click', showPrevPage);
document.getElementById('next-page').addEventListener('click', showNextPage);

document.getElementById('zoom-in').addEventListener('click', () => {
    scale += 0.25;
    document.getElementById('zoom-val').textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
});

document.getElementById('zoom-out').addEventListener('click', () => {
    if (scale <= 0.5) return;
    scale -= 0.25;
    document.getElementById('zoom-val').textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
});

document.getElementById('page-num').addEventListener('change', (e) => {
    let num = parseInt(e.target.value);
    if (num > 0 && num <= pdfDoc.numPages) {
        pageNum = num;
        queueRenderPage(pageNum);
    } else {
        e.target.value = pageNum;
    }
});
