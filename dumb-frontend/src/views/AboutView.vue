<script setup lang="ts">
import StarfieldBackground from '../components/common/StarfieldBackground.vue'
</script>

<template>
  <section class="about-page">
    <StarfieldBackground />
    <header class="about-header">
      <router-link class="about-brand" to="/" aria-label="返回 DUMB SIGNAL 首页">DUMB</router-link>
      <span class="about-section">ABOUT / 01</span>
    </header>

    <main class="about-main">
      <section class="about-intro" aria-labelledby="about-title">
        <p class="about-kicker">DUMB SIGNAL / ABOUT</p>
        <h1 id="about-title">记录值得再次<br />播放与观看的作品。</h1>
        <p class="about-lead">
          DUMB 是一个专注于音乐、动漫与电影评论的平台。我们从独立视角出发，
          留下作品与当下相遇时最真实的感受。
        </p>
      </section>

      <section class="about-statement" aria-label="DUMB 简介">
        <span class="statement-label">SIGNAL</span>
        <p>
          不追逐即时结论，也不把审美简化成分数。这里收集声音、画面与叙事，
          让每一条更新成为通往作品本身的入口。
        </p>
      </section>

      <section class="credits" aria-labelledby="credits-title">
        <div class="credits-heading">
          <p class="about-kicker">ATTRIBUTION</p>
          <h2 id="credits-title">场景署名</h2>
        </div>

        <article class="credit-row">
          <span class="credit-index">01</span>
          <div class="credit-copy">
            <p class="credit-role">首页人物模型</p>
            <h3>Scifi Girl v.01 <span>by patrix</span></h3>
            <p>模型已针对网页实时展示进行优化。</p>
          </div>
          <div class="credit-links">
            <a
              href="https://sketchfab.com/3d-models/scifi-girl-v01-96340701c2ed4d37851c7d9109eee9c0"
              target="_blank"
              rel="noreferrer"
            >SOURCE <span aria-hidden="true">↗</span></a>
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >CC BY-NC-SA 4.0 <span aria-hidden="true">↗</span></a>
          </div>
        </article>

        <article class="credit-row">
          <span class="credit-index">02</span>
          <div class="credit-copy">
            <p class="credit-role">首页展馆场景</p>
            <h3>Modern VR Art Gallery Pyramid <span>by Maxim Mavrichev</span></h3>
            <p>烘焙贴图已针对网页实时展示进行压缩。</p>
          </div>
          <div class="credit-links">
            <a
              href="https://sketchfab.com/3d-models/modern-vr-art-gallery-pyramid-c43438ef93dd406d93c3ade933e739ec"
              target="_blank"
              rel="noreferrer"
            >SOURCE <span aria-hidden="true">↗</span></a>
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >CC BY 4.0 <span aria-hidden="true">↗</span></a>
          </div>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped>
.about-page {
  position: relative;
  isolation: isolate;
  min-height: calc(100vh - 36px);
  background: #000;
  color: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.about-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.about-brand {
  color: #fff;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: 1.7rem;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
  text-decoration: none;
}

.about-brand:focus-visible,
.credit-links a:focus-visible {
  outline: 1px solid #fff;
  outline-offset: 5px;
}

.about-section,
.about-kicker,
.statement-label,
.credit-index,
.credit-role {
  margin: 0;
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.4;
}

.about-main {
  position: relative;
  z-index: 1;
  max-width: 1040px;
  margin: 0 auto;
  padding: clamp(72px, 10vw, 132px) 0 96px;
}

.about-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.42fr);
  column-gap: clamp(48px, 9vw, 120px);
  align-items: end;
}

.about-intro .about-kicker {
  grid-column: 1 / -1;
  margin-bottom: 26px;
}

h1 {
  margin: 0;
  max-width: 760px;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: clamp(2.7rem, 5.6vw, 5.25rem);
  font-weight: 400;
  line-height: 1.16;
  letter-spacing: 0;
}

.about-lead {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.9rem;
  line-height: 1.9;
}

.about-statement {
  display: grid;
  grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr);
  gap: 28px;
  margin-top: clamp(88px, 13vw, 160px);
  padding: 34px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.about-statement p {
  max-width: 720px;
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.25rem, 2.1vw, 1.8rem);
  line-height: 1.65;
}

.credits {
  margin-top: clamp(90px, 12vw, 144px);
}

.credits-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 38px;
}

.credits-heading h2 {
  margin: 0;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: clamp(1.8rem, 3.2vw, 2.8rem);
  font-weight: 400;
  letter-spacing: 0;
}

.credit-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) minmax(150px, auto);
  gap: 26px;
  align-items: start;
  padding: 30px 0 34px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}

.credit-row:last-child {
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.credit-copy h3 {
  margin: 8px 0 12px;
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.2rem, 2vw, 1.65rem);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0;
}

.credit-copy h3 span {
  color: rgba(255, 255, 255, 0.45);
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 400;
}

.credit-copy > p:last-child {
  margin: 0;
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.78rem;
  line-height: 1.7;
}

.credit-links {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  padding-top: 21px;
}

.credit-links a {
  color: rgba(255, 255, 255, 0.64);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0;
  text-decoration: none;
  transition: color 180ms ease;
}

.credit-links a:hover {
  color: #fff;
}

.credit-links a span {
  display: inline-block;
  margin-left: 4px;
}

@media (max-width: 760px) {
  .about-header {
    padding-top: 4px;
    padding-bottom: 22px;
  }

  .about-brand {
    font-size: 1.45rem;
  }

  .about-main {
    padding: 60px 2px 72px;
  }

  .about-intro {
    display: block;
  }

  .about-intro .about-kicker {
    margin-bottom: 20px;
  }

  h1 {
    font-size: clamp(2.25rem, 11vw, 3.4rem);
  }

  .about-lead {
    max-width: 34rem;
    margin-top: 34px;
  }

  .about-statement {
    display: block;
    margin-top: 76px;
    padding: 26px 0 30px;
  }

  .about-statement p {
    margin-top: 20px;
    font-size: 1.2rem;
  }

  .credits {
    margin-top: 76px;
  }

  .credits-heading {
    display: block;
    margin-bottom: 30px;
  }

  .credits-heading h2 {
    margin-top: 10px;
  }

  .credit-row {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 12px;
    padding: 26px 0 30px;
  }

  .credit-copy h3 {
    margin-top: 6px;
  }

  .credit-copy h3 span {
    display: block;
    margin-top: 5px;
  }

  .credit-links {
    grid-column: 2;
    align-items: flex-start;
    padding-top: 8px;
  }
}
</style>
