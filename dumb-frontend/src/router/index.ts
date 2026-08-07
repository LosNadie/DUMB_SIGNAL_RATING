import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../views/MainLayout.vue'
import HomeView from '../views/HomeView.vue'
import ReviewsView from '../views/ReviewsView.vue'
import ReviewDetailView from '../views/ReviewDetailView.vue'
import AnimeListView from '../views/AnimeListView.vue'
import AnimeDetailView from '../views/AnimeDetailView.vue'
import MovieListView from '../views/MovieListView.vue'
import MovieDetailView from '../views/MovieDetailView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'
import SearchView from '../views/SearchView.vue'
import AboutView from '../views/AboutView.vue'
import AdminDashboardView from '../views/admin/AdminDashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash }
    }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'music', name: 'music', component: ReviewsView },
        { path: 'music/:id', name: 'music-detail', component: ReviewDetailView },
        { path: 'anime', name: 'anime', component: AnimeListView },
        { path: 'anime/:id', name: 'anime-detail', component: AnimeDetailView },
        { path: 'movie', name: 'movie', component: MovieListView },
        { path: 'movie/:id', name: 'movie-detail', component: MovieDetailView },
        { path: 'search', name: 'search', component: SearchView },
        { path: 'profile', name: 'profile', component: ProfileView },
        { path: 'about', name: 'about', component: AboutView },
        { path: 'admin', name: 'admin', component: AdminDashboardView },
      ],
    },
    { path: '/login', name: 'login', component: LoginView },
  ],
})

export default router
