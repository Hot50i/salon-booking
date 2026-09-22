const backgroundImages = [
    "/images-girl.jpg",
    "/female style.jpg",
    "/WhatsApp Image .jpg"
];

let currentImage = 0;

function changeBackground() {

    const background = document.querySelector(".background");

    background.style.backgroundImage =
        `linear-gradient(
            rgba(34, 34, 34, 0.45),
            rgba(34, 34, 34, 0.45)
        ),
        url("${backgroundImages[currentImage]}")`;

    currentImage++;

    // When we reach the last image,
    // start again from the first image
    if (currentImage >= backgroundImages.length) {
        currentImage = 0;
    }
}

// Show the first image
changeBackground();

// Change image every 5 seconds forever
setInterval(changeBackground, 5000);



setTimeout(function () {
    const messages = document.querySelectorAll(".flash-message, .error-message");

    messages.forEach(function (message) {
        message.remove();
    });
}, 3000);





    setTimeout(function () {
        const flashMessage = document.querySelector(".flash-message");

        if (flashMessage) {
            flashMessage.style.opacity = "0";

            setTimeout(function () {
                flashMessage.remove();
            }, 500);
        }
    }, 3000);