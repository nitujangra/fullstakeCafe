const dotenv = require('dotenv');
// 1. Explicitly point to the .env file in the root directory
dotenv.config({ path: './.env' }); 

const mongoose = require('mongoose');
const Product = require('../models/Product'); 

// 2. Use process.env.MONGO_URI directly to avoid ReferenceErrors
const MONGO_URI = process.env.MONGO_URI;

const foodItems = [
    { name: "sahi panner with roti", price: 250, image: "/uploads/sahi panner with roti.jpeg", category: "meal", 
        description: "A delicious meal of creamy paneer curry served with soft rotis." },
        
    { name: "pani puri", price: 180, image: "/uploads/pani puri.jpeg", category: "junkfood",
        description: "Crispy puris filled with spicy and tangy water, perfect for a quick snack."
     },
    { name: "soup", price: 180, image: "/uploads/soup.jpeg", category: "junkfood",
        description: "Warm and comforting soup, ideal for chilly days or when you need a light meal."
     },
    { name: "chill potato", price: 250, image: "/uploads/chill potato.jpeg", category: "junkfood",
        description: "Spicy and flavorful chilled potato dish, a great appetizer or side."
     },
    { name: "paper roll", price: 150, image: "/uploads/paper roll.jpeg", category: "junkfood",
        description: "Crispy paper rolls filled with a savory mixture, perfect for on-the-go snacking."
     },
    { name: "south indian", price: 500, image: "/uploads/south indian.jpeg", category: "southindian",
        description: "A hearty South Indian meal featuring dosa, idli, vada, and sambar."
     },
    { name: "fries", price: 180, image: "/uploads/fries.jpeg", category: "junkfood",
        description: "Crispy and golden fried potatoes, perfect as a side dish."
     },
    { name: "burger", price: 190, image: "/uploads/burger.jpeg", category: "junkfood",
        description: "A classic burger with fresh ingredients and a soft bun."
     },
    { name: "veg burger", price: 180, image: "/uploads/veg burger.jpeg", category: "junkfood",
        description: "A vegetarian burger packed with fresh vegetables and a savory sauce."
     },
    { name: "chesse burger", price: 99, image: "/uploads/chesse burger.jpeg", category:"junkfood",
        description: "A cheese-filled burger with a crispy exterior and melted cheese inside."
     },
    { name:"coffee", price :90,image:"/uploads/coffee.jpeg",category:"coffee",
        description: "A rich and aromatic coffee, perfect for a quick energy boost or a relaxing break."
    },
    { name: "cold coffee", price: 190, image: "/uploads/cold coffee.jpeg", category: "coffee",
        description: "A refreshing cold coffee blend, ideal for a cool and energizing drink."
     },
    { name: "ice cream", price: 180, image: "/uploads/ice cream.jpeg", category: "icecream",
        description: "Creamy and delicious ice cream in a variety of flavors."
     },
    { name: "lava cake", price: 180, image: "/uploads/lava cake.jpeg", category: "dessert",
        description: "A warm and gooey lava cake with a molten center, served with ice cream."
     },
     { name: "banana milk shake", price: 50, image: "/uploads/banana milk shake.jpeg", category: "drinks",
        description: "A creamy and refreshing banana milk shake, perfect for a sweet treat."
     },
    { name: "choco cake", price: 150, image: "/uploads/choco cake.jpeg", category: "dessert",
        description: "Rich and decadent chocolate cake with a smooth chocolate ganache topping."
     },
    { name: "cold strawberry", price: 180, image: "/uploads/cold strawberry.jpeg", category: "drinks",
        description: "Refreshing cold strawberry drink with a hint of sweetness."
     },
    { name: "fried momos", price: 190, image: "/uploads/fried momos.jpeg", category: "junkfood",
        description: "Crispy and golden fried momos, perfect as a side dish."
     },
    { name: "mango juice", price: 70, image: "/uploads/mango juice.jpeg", category: "drinks",
        description: "Fresh and sweet mango juice, ideal for a refreshing drink."
     },
    { name: "onion pizza", price: 99, image: "/uploads/onion pizza.jpeg", category: "junkfood",
        description: "A delicious onion pizza with a crispy crust and melted cheese."
     },
    { name: "paneer cheese pizza", price: 90, image: "/uploads/paneer cheese pizza.jpeg", category: "junkfood",
        description: "A flavorful paneer cheese pizza with a rich tomato sauce."
     },
    { name: "corn chesse pizza", price: 190, image: "/uploads/corn chesse pizza.jpeg", category: "junkfood",
        description: "A corn and cheese pizza with a perfect blend of flavors."
     },
    { name: "momos", price: 180, image: "/uploads/momos.jpeg", category: "junkfood",
        description: "Soft and tasty momos filled with vegetables or meat."
     },
    { name: "strawberry ice cream", price: 99, image: "/uploads/strawberry ice cream.jpeg", category: "icecream",
        description: "Delicious strawberry-flavored ice cream with real strawberry pieces."
     },
    { name: "3 in 1 ice cream", price: 150, image: "/uploads/3 in 1 ice cream.jpeg", category:"icecream",
        description:"A delightful combination of three different flavors in one creamy scoop."
     },
    { name:"almond ice cream", price :180,image:"/uploads/almond ice cream.jpeg",category:"icecream",
        description:"Rich and nutty almond-flavored ice cream with a smooth texture."
     },
    { name:"vanilla pastry", price :50,image:"/uploads/vanilla pastry.jpeg",category:"dessert",
        description:"A sweet vanilla-flavored pastry with a buttery crust."
    },
    { name: "strawberry cake", price: 280, image: "/uploads/strawberry cake.jpeg", category: "dessert",
        description: "A delicious strawberry cake with a light and fluffy texture."
     },
    { name: "special drinks", price: 180, image: "/uploads/special drinks.jpeg", category: "drinks",
        description: "A special blend of refreshing and exotic flavors."
     },
    { name: "special ice cream", price: 140, image: "/uploads/special ice cream.jpeg", category: "icecream",
        description: "A unique and creamy special ice cream with a rich flavor."
     },
    { name: "idli", price: 159, image: "/uploads/idli.jpeg", category: "southindian",
        description: "Soft and fluffy idli made from fermented rice and lentil batter."
     },
    { name: "onam food", price: 200, image: "/uploads/onam food.jpeg", category: "southindian",
        description: "Traditional Onam dishes served during the festival season."
     },
    { name: "mojito", price: 180, image: "/uploads/mojito.jpeg", category: "drinks",
        description: "Refreshing mint-based cocktail with lime and soda water."
     },
    { name: "masala dosa", price: 199, image: "/uploads/masala dosa.jpeg", category:"southindian",
        description:"A crispy dosa filled with spiced potato masala and served with chutney."
     },
    { name:"mango ice cream", price :149,image:"/uploads/mango ice cream.jpeg",category:"icecream",
        description:"Creamy mango-flavored ice cream made with real mango pulp."
     },                   
];

const seedDB = async () => {
    try {
        // 3. Validation: Ensure the URI is actually loaded
        if (!MONGO_URI) {
            throw new Error("MONGO_URI is undefined. Check your .env file and path.");
        }

        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB Atlas ✅");

        await Product.deleteMany({});
        console.log("Old products cleared 🗑️");

        await Product.insertMany(foodItems);
        console.log("Database Seeded Successfully 🥣");

        await mongoose.connection.close();
        process.exit(0); // 4. Clean exit
    } catch (error) {
        console.error("Error seeding database ❌:", error);
        process.exit(1); // 5. Error exit
    }
};

seedDB();