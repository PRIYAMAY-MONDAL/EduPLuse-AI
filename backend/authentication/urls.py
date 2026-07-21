from django.urls import path
from . import views
from .views import forgot_password_view

urlpatterns = [
    path('register/', views.register_student, name='api_register'),
    path('login/', views.login_student, name='api_login'),
    path('chat/', views.chat_with_tutor, name='api_chat'),
    path('generate-quiz/', views.generate_custom_quiz, name='api_generate_quiz'), # New route
    path('api/auth/forgot-password/', forgot_password_view, name='forgot-password-api'),
]