const uploadBtn = document.getElementById('upload-btn');
const uploadInput = document.getElementById('image-upload');
const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const expandedImage = document.getElementById('expanded-image');
const deleteBtn = document.getElementById('delete-btn');
const closeBtn = document.getElementById('close-btn');
const imageCount = document.getElementById('image-count');
const totalSize = document.getElementById('total-size');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');
const managementBar = document.getElementById('management-bar');
const downloadSelectedBtn = document.getElementById('download-selected');
const deleteSelectedBtn = document.getElementById('delete-selected');
const clearSelectionBtn = document.getElementById('clear-selection');
const selectedCount = document.getElementById('selected-count');

let imagesData = [];
let totalStorage = 0;
let selectedImages = new Set();

// Particle System
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
        this.color = `hsla(${Math.random() * 360}, 70%, 70%, 0.3)`;
    }

    update() {
        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
        this.x += this.speedX;
        this.y += this.speedY;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize particles
const particles = Array.from({ length: 80 }, () => new Particle());

function animateParticles() {
    ctx.fillStyle = 'rgba(248, 249, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    requestAnimationFrame(animateParticles);
}

// Gallery Functions
function updateStats() {
    imageCount.textContent = imagesData.length;
    totalSize.textContent = (totalStorage / 1024 / 1024).toFixed(2);
}

function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        totalStorage += file.size;
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = {
                id: crypto.randomUUID(),
                src: event.target.result,
                name: file.name,
                size: file.size,
                date: new Date()
            };
            imagesData.push(imageData);
            createImageElement(imageData);
            updateStats();
            sortImages();
        };
        reader.readAsDataURL(file);
    });
}

function createImageElement(data) {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.dataset.name = data.name.toLowerCase();
    galleryItem.dataset.date = data.date.getTime();
    galleryItem.dataset.id = data.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.addEventListener('change', handleSelection);

    const img = new Image();
    img.src = data.src;
    img.alt = data.name;
    img.addEventListener('click', () => showModal(data));

    galleryItem.append(checkbox, img);
    gallery.appendChild(galleryItem);
}

function showModal(data) {
    expandedImage.src = data.src;
    document.getElementById('image-info').innerHTML = `
        <div><strong>Name:</strong> ${data.name}</div>
        <div><strong>Uploaded:</strong> ${data.date.toLocaleString()}</div>
        <div><strong>Size:</strong> ${(data.size / 1024).toFixed(2)} KB</div>
    `;
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

// Selection Management
function handleSelection(e) {
    const galleryItem = e.target.closest('.gallery-item');
    const id = galleryItem.dataset.id;
    
    if (e.target.checked) {
        selectedImages.add(id);
        galleryItem.classList.add('selected');
    } else {
        selectedImages.delete(id);
        galleryItem.classList.remove('selected');
    }
    
    updateManagementBar();
}

function updateManagementBar() {
    selectedCount.textContent = selectedImages.size;
    downloadSelectedBtn.disabled = !selectedImages.size;
    deleteSelectedBtn.disabled = !selectedImages.size;
    managementBar.classList.toggle('hidden', !selectedImages.size);
}

// Bulk Actions
clearSelectionBtn.addEventListener('click', () => {
    selectedImages.clear();
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('.checkbox').checked = false;
    });
    updateManagementBar();
});

deleteSelectedBtn.addEventListener('click', () => {
    if (selectedImages.size && confirm(`Delete ${selectedImages.size} selected images?`)) {
        selectedImages.forEach(id => {
            const index = imagesData.findIndex(img => img.id === id);
            if (index > -1) {
                totalStorage -= imagesData[index].size;
                imagesData.splice(index, 1);
            }
            document.querySelector(`.gallery-item[data-id="${id}"]`)?.remove();
        });
        selectedImages.clear();
        updateStats();
        updateManagementBar();
    }
});

downloadSelectedBtn.addEventListener('click', async () => {
    try {
        const zip = new JSZip();
        const folder = zip.folder('images');
        
        await Promise.all(Array.from(selectedImages).map(async id => {
            const image = imagesData.find(img => img.id === id);
            const response = await fetch(image.src);
            const blob = await response.blob();
            folder.file(image.name, blob);
        }));
        
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'selected-images.zip');
    } catch (error) {
        console.error('Download failed:', error);
        alert('Error downloading images. Please try again.');
    }
});

// Search and Sort
function sortImages() {
    const items = Array.from(gallery.children);
    const sortBy = sortSelect.value;
    
    items.sort((a, b) => sortBy === 'date' ? 
        b.dataset.date - a.dataset.date : 
        a.dataset.name.localeCompare(b.dataset.name)
    ).forEach(item => gallery.appendChild(item));
}

function searchImages() {
    const term = searchInput.value.toLowerCase();
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.style.display = item.dataset.name.includes(term) ? 'block' : 'none';
    });
}

// Event Listeners
uploadBtn.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', handleImageUpload);
closeBtn.addEventListener('click', closeModal);
deleteBtn.addEventListener('click', () => {
    const currentSrc = expandedImage.src;
    const image = imagesData.find(img => img.src === currentSrc);
    if (image) {
        totalStorage -= image.size;
        imagesData = imagesData.filter(img => img.src !== currentSrc);
        document.querySelector(`.gallery-item[data-id="${image.id}"]`)?.remove();
        updateStats();
    }
    closeModal();
});
modal.addEventListener('click', (e) => e.target === modal && closeModal());
sortSelect.addEventListener('change', sortImages);
searchInput.addEventListener('input', searchImages);
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Initialize
animateParticles();
updateStats();