

document.addEventListener("DOMContentLoaded", () => {
  
  const elements = document.querySelectorAll(".element");
  const popup = document.getElementById("element-popup");
  const closeBtn = document.querySelector(".popup-close-btn");

  
  const showPopup = (element) => {
   
    const name = element.getAttribute("data-name");
    const symbol = element.getAttribute("data-symbol");
    const number = element.getAttribute("data-number");
    const desc = element.getAttribute("data-desc");

    
    document.querySelector(".popup-name").textContent = name;
    document.querySelector(".popup-symbol").textContent = symbol;
    document.querySelector(".popup-number").textContent = number;
    document.querySelector(".popup-description").textContent = desc;

    
    popup.style.display = "block";
  };

  
  const hidePopup = () => {
    popup.style.display = "none";
  };

  
  elements.forEach((element) => {
    element.addEventListener("click", () => {
      showPopup(element);
    });
  });

  
  closeBtn.addEventListener("click", hidePopup);

  
  document.addEventListener("click", (event) => {
    
    if (!popup.contains(event.target) && !event.target.closest(".element")) {
      hidePopup();
    }
  });
});
