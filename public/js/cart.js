// SELECT ALL CART BUTTONS
const cartButtons = document.querySelectorAll(".cart-btn");

cartButtons.forEach(button => {

    button.addEventListener("click", () => {

        const item = {
            name: button.dataset.name,
            price: button.dataset.price,
            image: button.dataset.image
        };

        fetch("/add-to-cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(item)
        })
        .then(res => res.json())
        .then(data => {
            alert("✅ Item added to cart!");
        })
        .catch(err => console.log(err));

    });

});
