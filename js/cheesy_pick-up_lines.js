function cheesy_pick_up_lines() {
  let html = "";
  for (let i = 0; i < 1; i++) {
    fetch("/html/quote.html")
      .then((data) => data.text())
      .then((data) => {
        html += data;
        document.querySelector("#cheesy_pick-up_lines-container").innerHTML =
          html;
      })
      .catch(function (error) {
        console.log(error);
      });
  }
}

cheesy_pick_up_lines();