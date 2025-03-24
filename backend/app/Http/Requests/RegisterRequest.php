<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'user_name' => 'required|string|max:50|unique:users',
            // 'birth_day' => 'required|date|before:today',
            // 'gen' => 'required|string|in:male,female,other',
            // 'my_name' => 'nullable|string|max:255',
            // 'phone' => 'required|string|min:10|max:15|regex:/^([0-9\s\-\+\(\)]*)$/',
            // 'address' => 'nullable|string|max:255',
            // 'university' => 'nullable|string|max:255',
            // 'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];
    }

}
