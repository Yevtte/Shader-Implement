
varying vec4 vPos;
varying vec3 normal;
varying float lightIntensity;


void main()
{
	vPos = gl_ModelViewMatrix * gl_Vertex;
	
	normal = normalize(gl_NormalMatrix * gl_Normal);

	vec3 ecPos = normalize(vec3(vPos.xyz));
	lightIntensity = dot(-ecPos, normal);
	const float bias = 0.2;
	vec3 vertexPos = vec3(gl_Vertex);
	vec3 silhouettePos = vertexPos + normal * bias;
	if(lightIntensity>0.0)
		gl_Position =  gl_ModelViewProjectionMatrix * vec4(vertexPos, 1.0);
	else
		gl_Position =  gl_ModelViewProjectionMatrix * vec4(silhouettePos, 1.0);


	gl_FrontColor = gl_Color*gl_LightSource[0].diffuse * 
					vec4(max(dot(normal, gl_LightSource[0].position.xyz), 0.0));

	gl_TexCoord[0] = gl_MultiTexCoord0;
}