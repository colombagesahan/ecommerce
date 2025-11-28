// Import specific functions from Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, onSnapshot, setDoc, getDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ==========================================
// 1. FIREBASE CONFIGURATION (YOURS)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDBOTUu8txawnC0jrh8ctY1wzKWZkESKfg",
    authDomain: "ecom02-b8310.firebaseapp.com",
    projectId: "ecom02-b8310",
    storageBucket: "ecom02-b8310.firebasestorage.app",
    messagingSenderId: "1044224602906",
    appId: "1:1044224602906:web:d8a2f362a6158fcf40f2a3",
    measurementId: "G-R5SCHPHFQC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global Variables
let cart = [];
const YOUR_WHATSAPP_NUMBER = "94770000000"; // REPLACE THIS WITH YOUR NUMBER

// ==========================================
// 2. WEBSITE CONFIG LOADER (Shared)
// ==========================================
async function loadSiteConfig() {
    const docRef = doc(db, "settings", "general");
    
    // Listen for setting changes
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Apply Color Theme
            document.documentElement.style.setProperty('--primary-color', data.color || '#0d6efd');
            
            // Apply Text
            if(document.getElementById('store-name')) {
                document.getElementById('store-name').innerText = data.storeName || "My Store";
                document.title = data.storeName || "My Store";
            }
            if(document.getElementById('hero-title')) document.getElementById('hero-title').innerText = data.heroTitle || "Welcome";
            if(document.getElementById('hero-subtitle')) document.getElementById('hero-subtitle').innerText = data.heroSub || "";
            if(document.getElementById('footer-text')) document.getElementById('footer-text').innerText = data.footerText || "© 2024";
        }
    });

    // Load Extra Sections
    const sectionsContainer = document.getElementById('dynamic-sections');
    if (sectionsContainer) {
        onSnapshot(collection(db, "sections"), (snap) => {
            sectionsContainer.innerHTML = "";
            snap.forEach(doc => {
                const sec = doc.data();
                sectionsContainer.innerHTML += `
                    <div class="card mb-4 shadow-sm border-0">
                        <div class="card-body p-4">
                            <h3 class="card-title">${sec.title}</h3>
                            <p class="card-text">${sec.content}</p>
                        </div>
                    </div>
                `;
            });
        });
    }
}
loadSiteConfig();

// ==========================================
// 3. CUSTOMER LOGIC (index.html)
// ==========================================
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {

    const productContainer = document.getElementById('product-list');

    // Load Products
    onSnapshot(collection(db, "products"), (snapshot) => {
        productContainer.innerHTML = '';
        if(snapshot.empty) {
            productContainer.innerHTML = '<div class="col-12 text-center text-muted">No products added yet.</div>';
            return;
        }
        snapshot.forEach((doc) => {
            const prod = doc.data();
            productContainer.innerHTML += `
                <div class="col-6 col-md-4 col-lg-3">
                    <div class="card h-100">
                        <img src="${prod.image}" class="product-img card-img-top" alt="${prod.name}" onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title" style="font-size:1rem;">${prod.name}</h5>
                            <p class="card-text fw-bold text-primary mt-auto mb-2">Rs. ${prod.price}</p>
                            <button class="btn btn-outline-primary w-100 btn-sm" onclick="addToCart('${doc.id}', '${prod.name}', ${prod.price})">Add to Cart</button>
                        </div>
                    </div>
                </div>
            `;
        });
    });

    // Add to Cart
    window.addToCart = (id, name, price) => {
        cart.push({ id, name, price });
        updateCartUI();
        // Show small alert or animation here if desired
    };

    function updateCartUI() {
        document.getElementById('cart-count').innerText = cart.length;
        const cartList = document.getElementById('cart-items');
        let total = 0;
        cartList.innerHTML = '';
        
        cart.forEach((item, index) => {
            total += item.price;
            cartList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${item.name}</span>
                    <div>
                        <span class="me-2 small">Rs.${item.price}</span>
                        <button class="btn btn-sm btn-outline-danger py-0" onclick="removeFromCart(${index})">×</button>
                    </div>
                </li>
            `;
        });
        document.getElementById('cart-total').innerText = "Rs. " + total;
    }

    window.removeFromCart = (i) => { cart.splice(i, 1); updateCartUI(); };

    // Checkout Logic
    window.checkout = async () => {
        if (cart.length === 0) return alert("Your cart is empty!");
        const name = document.getElementById('customer-name').value.trim();
        const address = document.getElementById('customer-address').value.trim();
        
        if(!name || !address) return alert("Please enter your Name and Address.");

        let total = cart.reduce((sum, i) => sum + i.price, 0);
        
        try {
            // 1. Save to Database
            await addDoc(collection(db, "orders"), {
                customerName: name,
                customerAddress: address,
                items: cart,
                total: total,
                createdAt: serverTimestamp()
            });

            // 2. Send WhatsApp
            let msg = `*New Order*\nCustomer: ${name}\nAddress: ${address}\n\n*Items:*\n`;
            cart.forEach(i => msg += `- ${i.name} (Rs.${i.price})\n`);
            msg += `\n*Total Bill: Rs. ${total}*`;
            
            const whatsappUrl = `https://wa.me/${YOUR_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
            window.open(whatsappUrl, '_blank');
            
            // 3. Reset
            cart = []; 
            updateCartUI();
            bootstrap.Modal.getInstance(document.getElementById('cartModal')).hide();
        } catch (e) {
            console.error(e);
            alert("Error placing order. Check console.");
        }
    };
}

// ==========================================
// 4. ADMIN LOGIC (admin.html)
// ==========================================
if (window.location.pathname.endsWith('admin.html')) {

    // --- A. PRODUCTS ---
    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('prod-name').value;
        const price = Number(document.getElementById('prod-price').value);
        const image = document.getElementById('prod-img').value; // URL only

        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.innerText = "Adding...";

        try {
            await addDoc(collection(db, "products"), { name, price, image });
            alert("Product Added!");
            e.target.reset();
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            btn.disabled = false;
            btn.innerText = "Add Product";
        }
    });

    // List Products (Admin)
    onSnapshot(collection(db, "products"), (snap) => {
        const list = document.getElementById('admin-product-list');
        list.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data();
            list.innerHTML += `
                <div class="col-6 col-md-4">
                    <div class="card h-100">
                        <img src="${p.image}" class="card-img-top" style="height:120px; object-fit:cover" onerror="this.src='https://via.placeholder.com/150'">
                        <div class="card-body p-2 text-center">
                            <h6 class="card-title small">${p.name}</h6>
                            <p class="m-0 small">Rs.${p.price}</p>
                            <button onclick="deleteProduct('${doc.id}')" class="btn btn-sm btn-danger w-100 mt-2">Delete</button>
                        </div>
                    </div>
                </div>`;
        });
    });
    window.deleteProduct = async (id) => { if(confirm("Delete this?")) await deleteDoc(doc(db, "products", id)); };


    // --- B. ORDERS ---
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const list = document.getElementById('admin-order-list');
        list.innerHTML = "";
        if(snap.empty) list.innerHTML = "<tr><td colspan='4'>No orders yet.</td></tr>";

        snap.forEach(doc => {
            const o = doc.data();
            const date = o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : "Just now";
            const items = o.items.map(i => i.name).join(", ");
            
            list.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td><strong>${o.customerName}</strong><br><small class="text-muted">${o.customerAddress}</small></td>
                    <td><small>${items}</small></td>
                    <td><span class="badge bg-success">Rs.${o.total}</span></td>
                </tr>`;
        });
    });


    // --- C. SITE BUILDER ---
    // Load existing settings to form
    getDoc(doc(db, "settings", "general")).then(snap => {
        if(snap.exists()) {
            const d = snap.data();
            document.getElementById('conf-name').value = d.storeName || "";
            document.getElementById('conf-color').value = d.color || "#0d6efd";
            document.getElementById('conf-footer').value = d.footerText || "";
            document.getElementById('conf-hero-title').value = d.heroTitle || "";
            document.getElementById('conf-hero-sub').value = d.heroSub || "";
        }
    });

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            storeName: document.getElementById('conf-name').value,
            color: document.getElementById('conf-color').value,
            footerText: document.getElementById('conf-footer').value,
            heroTitle: document.getElementById('conf-hero-title').value,
            heroSub: document.getElementById('conf-hero-sub').value
        };
        await setDoc(doc(db, "settings", "general"), settings);
        alert("Website Settings Updated!");
    });

    // Sections Logic
    document.getElementById('add-section-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "sections"), {
            title: document.getElementById('sec-title').value,
            content: document.getElementById('sec-content').value
        });
        e.target.reset();
    });

    onSnapshot(collection(db, "sections"), (snap) => {
        const list = document.getElementById('admin-sections-list');
        list.innerHTML = "";
        snap.forEach(doc => {
            list.innerHTML += `<li class="list-group-item d-flex justify-content-between">${doc.data().title} <button onclick="deleteSection('${doc.id}')" class="btn btn-sm btn-danger py-0">x</button></li>`;
        });
    });
    window.deleteSection = async (id) => await deleteDoc(doc(db, "sections", id));
}
