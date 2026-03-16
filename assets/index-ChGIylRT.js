(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const Validator = {
  validatePurchasePrice(input) {
    const purchasePrice2 = Number(input.trim());
    if (Number.isNaN(purchasePrice2)) {
      throw new Error("[ERROR] 구입 금액이 숫자가 아닙니다!");
    }
    if (Number(purchasePrice2) < 1e3) {
      throw new Error("[ERROR] 구입 최소 금액은 1000원 입니다!");
    }
    return purchasePrice2;
  },
  validateWinningNumbers(inputs) {
    const numbers = inputs.map((numStr) => Number(numStr));
    const winningNumbers = this.validateCommonNumbers(numbers);
    const isOutRange = winningNumbers.some((num) => num < 1 || num > 45);
    if (isOutRange) {
      throw new Error(`[ERROR] 당첨 번호는 1~45 범위여야 합니다!`);
    }
    return winningNumbers;
  },
  validateCommonNumbers(numbers) {
    const hasNaN = numbers.some((n) => Number.isNaN(n));
    if (hasNaN) {
      throw new Error("[ERROR] 각 번호가 숫자가 아닙니다!");
    }
    if (numbers.length !== 6) {
      throw new Error(`[ERROR] 번호는 6개여야 합니다!`);
    }
    if (new Set(numbers).size !== numbers.length) {
      throw new Error("[ERROR] 중복된 숫자가 있습니다.");
    }
    return numbers;
  },
  validateBonusNumber(input, winningNumbers) {
    const bonusNumber = Number(input.trim());
    if (Number.isNaN(bonusNumber) || bonusNumber < 1 || bonusNumber > 45) {
      throw new Error("[ERROR] 보너스 번호는 1~45 범위의 숫자여야 합니다!");
    }
    if (winningNumbers.includes(bonusNumber)) {
      throw new Error("[ERROR] 보너스 번호가 당첨번호와 중복됩니다!");
    }
    return bonusNumber;
  },
  validateRestart(input) {
    const command = input.trim().toLowerCase();
    if (command !== "y" && command !== "n") {
      throw new Error("[ERROR] y 또는 n을 입력해주세요!");
    }
    return command;
  }
};
class Lotto {
  #numbers;
  constructor(numbers) {
    Validator.validateCommonNumbers(numbers);
    this.#numbers = numbers;
  }
  // 당첨 번호 일치 개수 세기
  countMatches(winningNumbers) {
    return this.#numbers.filter((num) => winningNumbers.includes(num)).length;
  }
  // 보너스 번호 포함 여부 확인
  hasBonus(bonusNumber) {
    return this.#numbers.includes(bonusNumber);
  }
  // 로또 번호 배열을 문자열 형태로 표현
  toString() {
    return `[${this.#numbers.join(", ")}]`;
  }
}
class LottoMachine {
  issueLottos(purchasePrice2) {
    const ticketsCount = purchasePrice2 / 1e3;
    return Array.from({ length: ticketsCount }, () => this.#createLotto());
  }
  #createLotto() {
    const lottoNumbers = MissionUtils.Random.pickUniqueNumbersInRange(
      1,
      45,
      6
    ).sort((a, b) => a - b);
    return new Lotto(lottoNumbers);
  }
}
const PRIZE = {
  FIFTH: 5e3,
  FOURTH: 5e4,
  THIRD: 15e5,
  SECOND: 3e7,
  FIRST: 2e9
};
const RANK_MAP = {
  FIRST: "6개",
  SECOND: "5개+보너스볼",
  THIRD: "5개",
  FOURTH: "4개",
  FIFTH: "3개"
};
const OutputView = {
  printLottoList(lottos2) {
    const lottoCount = document.querySelector("#lotto-count");
    lottoCount.textContent = `총 ${lottos2.length}개를 구매하였습니다.`;
    let lottosHtml = "";
    const lottoList = document.getElementById("lotto-list");
    lottos2.forEach((lotto) => {
      lottosHtml += `
      <li class="lotto-item">
          <span class="emoji">🎟️</span>
          <span id = "lotto">${lotto.toString().replace(/^\[|\]$/g, "")}</span>
        </li>`;
    });
    lottoList.innerHTML = lottosHtml;
  },
  printMatchResult(result) {
    const winningRowResult = document.querySelector("#winning-row-result");
    let winnigResultHtml = "";
    result = Object.fromEntries(Object.entries(result).reverse());
    for (const key in result) {
      const prize = PRIZE[key].toLocaleString();
      const count = result[key];
      winnigResultHtml += `
      <tr>
        <td>${RANK_MAP[key]}</td>
        <td>${prize}</td>
        <td>${count}개</td>
      </tr>

      `;
    }
    winningRowResult.innerHTML = winnigResultHtml;
  },
  printProfitRate(profitRate) {
    const lottoCount = document.querySelector("#profitRate-print");
    lottoCount.textContent = `당신의 총 수익률은 ${profitRate}%입니다.`;
  },
  printErrorMessage(errorMessage) {
    Console.print(errorMessage);
  }
};
class LottoResultCalculator {
  calculateWinningRank(lottos2, luckyNumbers) {
    const result = { FIRST: 0, SECOND: 0, THIRD: 0, FOURTH: 0, FIFTH: 0 };
    for (const lotto of lottos2) {
      const match = lotto.countMatches(luckyNumbers.winningNumbers);
      const hasBonus = lotto.hasBonus(luckyNumbers.bonusNumber);
      if (match === 6) result["FIRST"]++;
      else if (match === 5 && hasBonus) result["SECOND"]++;
      else if (match === 5) result["THIRD"]++;
      else if (match === 4) result["FOURTH"]++;
      else if (match === 3) result["FIFTH"]++;
    }
    return result;
  }
  calculateProfitRate(winningResult, purchasePrice2) {
    const totalPrize = this.calculateTotalPrize(winningResult);
    const profitRate = totalPrize / purchasePrice2 * 100;
    return Number(profitRate.toFixed(1));
  }
  calculateTotalPrize(winningResult) {
    return Object.entries(winningResult).reduce(
      (sum, [key, count]) => sum + PRIZE[key] * count,
      0
    );
  }
}
let lottos = [];
let purchasePrice = 0;
const inputPrice = document.querySelector("#inputPrice");
const purchaseButton = document.querySelector("#purchaseButton");
const winningLottoSection = document.querySelector(".winning-lotto");
const resultButton = document.querySelector("#result-button");
const modalOverLay = document.querySelector(".modal-overlay");
const restartButton = document.querySelector("#restart-button");
const closeButton = document.querySelector("#close-button");
purchaseButton.addEventListener("click", () => {
  try {
    purchasePrice = Validator.validatePurchasePrice(inputPrice.value);
    const lottoMachine = new LottoMachine();
    lottos = lottoMachine.issueLottos(purchasePrice);
    OutputView.printLottoList(lottos);
    winningLottoSection.classList.add("show");
    const winningText = document.getElementById("winning-numbers-text");
    const bonusText = document.getElementById("bonus-number-text");
    winningText.textContent = "당첨 번호";
    bonusText.textContent = "보너스 번호";
    resultButton.style.display = "block";
  } catch (e) {
    window.alert(e.message);
    inputPrice.value = "";
    inputPrice.focus();
  }
});
resultButton.addEventListener("click", () => {
  const number1 = document.getElementById("winning-number-input-1");
  const number2 = document.getElementById("winning-number-input-2");
  const number3 = document.getElementById("winning-number-input-3");
  const number4 = document.getElementById("winning-number-input-4");
  const number5 = document.getElementById("winning-number-input-5");
  const number6 = document.getElementById("winning-number-input-6");
  const bonusNumberInput = document.getElementById("bonus-number-input");
  try {
    modalOverLay.classList.add("show");
    const winningNumbers = Validator.validateWinningNumbers([
      number1.value,
      number2.value,
      number3.value,
      number4.value,
      number5.value,
      number6.value
    ]);
    const bonusNumber = Validator.validateBonusNumber(
      bonusNumberInput.value,
      winningNumbers
    );
    const luckyNumbers = {
      winningNumbers,
      bonusNumber
    };
    const resultCalculator = new LottoResultCalculator();
    const winningResult = resultCalculator.calculateWinningRank(
      lottos,
      luckyNumbers
    );
    OutputView.printMatchResult(winningResult);
    const profitRate = resultCalculator.calculateProfitRate(
      winningResult,
      purchasePrice
    );
    OutputView.printProfitRate(profitRate);
  } catch (e) {
    window.alert(e.message);
    modalOverLay.classList.remove("show");
    const firstInput = document.getElementById("winning-number-input-1");
    number1.value = "";
    number2.value = "";
    number3.value = "";
    number4.value = "";
    number5.value = "";
    number6.value = "";
    bonusNumberInput.value = "";
    if (firstInput) {
      firstInput.focus();
    }
  }
});
restartButton.addEventListener("click", () => {
  window.location.reload();
});
closeButton.addEventListener("click", () => {
  modalOverLay.classList.remove("show");
});
