# Conveyor Belt Game

- Must connect inputs to outputs with conveyor belts.
- Inputs are numbers.
- Outputs are other numbers.
- You have to combine numbers together to get bigger numbers.
- Your capacity to delete numbers is limited.
- You gain new operations as time goes on, starting with perhaps addition, multiplication, subtraction, and division?


- I'm gonna make all the game logic in a GLSL shader.


GPU Shader State:
- block type
    - none
    - conveyor belt (with four directions)
    - grabber (with four directions and lengths)
    - converter (add, sub, mul, div)