/* ================= GLOBAL VARIABLES ================= */
const container = document.getElementById("food-container");
const filter = document.getElementById("filter"); 
const searchInput = document.getElementById("searchInput");

let foodItems = [];
let selectedCategory = "all";

/* ================= FETCH PRODUCTS ================= */
// Note: Ensure your backend has a route: router.get("/api/products", productController.getAllProductsJSON)
if (container) {
    fetch("/products") // Adjusting to your product route if it returns JSON
        .then(res => {
            if (!res.ok) throw new Error("Server error");
            // Check if response is JSON before parsing
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return res.json();
            } else {
                throw new Error("Oops, the server didn't send JSON!");
            }
        })
        .then(data => {
            foodItems = data.foodItems || data; // Handle different response structures
            displayFoods(foodItems);
        })
        .catch(err => console.log("Note: API fetch failed. If you use server-side rendering, this is normal.", err));
}

/* ================= DISPLAY FUNCTION ================= */
function displayFoods(items) {
    if (!container) return;

    container.innerHTML = "";

    items.forEach(food => {
        const card = document.createElement("div");
        card.classList.add("card");

        card.dataset.category = food.category ? food.category.toLowerCase() : "all";
        card.dataset.name = food.name;
        card.dataset.price = food.price;
        card.dataset.description = food.description || "Delicious item from our menu!";

        card.innerHTML = `
            <img src="${food.image || '/images/default.png'}" alt="${food.name}" class="food-img">
            <h3>${food.name}</h3>
            <p>₹${food.price}</p>
            <button class="cart-btn">Add To Cart 🛒</button>
        `;

        // ---------- ADD TO CART (FIXED ROUTE) ----------
        const btn = card.querySelector(".cart-btn");
        btn.addEventListener("click", () => {
            fetch("/products/add-to-cart", { // URL updated to match app.js prefix
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: food.name,
                    price: food.price,
                    image: food.image
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("✅ " + food.name + " added to cart!");
                    // Update Cart Count Badge in Header if it exists
                    const badge = document.getElementById("cart-count");
                    if (badge && data.cartCount !== undefined) {
                        badge.textContent = data.cartCount;
                    }
                } else {
                    alert("❌ Could not add item. " + (data.message || ""));
                }
            })
            .catch(err => {
                console.error("Cart Error:", err);
                alert("❌ Error adding item to cart.");
            });
        });

        container.appendChild(card);
    });

    initImagePopup();
}

/* ================= FILTER FUNCTIONS ================= */
function filterCategory(category) {
    selectedCategory = category.toLowerCase();
    applyFilters();
}

function searchFood() {
    applyFilters();
}

function applyFilters() {
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const cards = document.querySelectorAll(".card");

    cards.forEach(card => {
        const foodName = card.dataset.name ? card.dataset.name.toLowerCase() : "";
        const foodCategory = card.dataset.category || "all";

        const categoryMatch = selectedCategory === "all" || foodCategory === selectedCategory;
        const searchMatch = foodName.includes(searchText);

        card.style.display = (categoryMatch && searchMatch) ? "" : "none";
    });
}

if (filter) filter.addEventListener("change", e => filterCategory(e.target.value));
if (searchInput) searchInput.addEventListener("input", searchFood);

/* ================= IMAGE POPUP FUNCTION ================= */
function initImagePopup() {
    let popup = document.getElementById("imagePopup");
    
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "imagePopup";
        popup.style.cssText = `
            display:none; position:fixed; top:0; left:0;
            width:100%; height:100%; background: rgba(0,0,0,0.85);
            justify-content:center; align-items:center;
            z-index:1000; flex-direction: column; color:white;
            text-align:center; padding:20px; cursor: pointer;
        `;
        document.body.appendChild(popup);
    }

    // Clear previous content to avoid duplicates on re-render
    popup.innerHTML = `
        <img id="popupImg" style="max-width:90%; max-height:60%; border-radius:10px; border: 3px solid #ffcc00;">
        <h2 id="popupName" style="margin-top:15px;"></h2>
        <p id="popupPrice" style="font-size:20px; color:#27ae60; font-weight:bold;"></p>
        <p id="popupDesc" style="max-width:600px; margin-top:10px; font-style:italic;"></p>
        <p style="margin-top:20px; font-size:12px; color:#aaa;">Click anywhere to close</p>
    `;

    const foodImages = document.querySelectorAll(".food-img");
    foodImages.forEach(image => {
        image.addEventListener("click", () => {
            const card = image.closest(".card");
            document.getElementById("popupImg").src = image.src;
            document.getElementById("popupName").textContent = card.dataset.name;
            document.getElementById("popupPrice").textContent = "₹ " + card.dataset.price;
            document.getElementById("popupDesc").textContent = card.dataset.description;
            popup.style.display = "flex";
        });
    });

    popup.onclick = () => popup.style.display = "none";
}