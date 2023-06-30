import Joi from 'joi';


const nameSchema = Joi.string().required().messages({
    'any.required': 'O campo "name" é obrigatório.',
    'string.empty': 'O campo "name" não pode estar vazio.',
});


const messageSchema = Joi.object({
    to: Joi.string().required().messages({
        'any.required': 'O campo "to" é obrigatório.',
        'string.empty': 'O campo "to" não pode estar vazio.',
    }),
    text: Joi.string().required().messages({
        'any.required': 'O campo "text" é obrigatório.',
        'string.empty': 'O campo "text" não pode estar vazio.',
    }),
    type: Joi.string().valid('message', 'private_message').required().messages({
        'any.required': 'O campo "type" é obrigatório.',
        'any.only': 'O campo "type" deve ser "message" ou "private_message".',
    }),
    from: Joi.string().required().messages({
        'any.required': 'O campo "from" é obrigatório.',
        'string.empty': 'O campo "from" não pode estar vazio.',
    })

})

export { nameSchema, messageSchema }